/**
 * SparkScan — axe Citations IA / GEO (V1, tâche #22).
 *
 * LE différenciant majeur vs SEMrush : mesurer la visibilité du site cible
 * et de ses concurrents dans les RÉPONSES des moteurs IA (ChatGPT, Perplexity,
 * Gemini). En 2026, de plus en plus de clients posent leurs questions à un
 * chatbot avant de chercher sur Google. Être cité dans ces réponses = être
 * visible. Ne pas l'être = être invisible.
 *
 * Pipeline :
 *   1. Claude génère 5 questions types qu'un prospect taperait à ChatGPT
 *      dans le secteur+zone du site cible.
 *   2. Pour chacune des 5 questions : on interroge Perplexity (sonar avec
 *      web search) en parallèle.
 *   3. Pour chaque réponse, on extrait les domaines cités (via le champ
 *      `citations` Perplexity + parsing texte fallback).
 *   4. On compte les mentions du target + des concurrents prioritaires.
 *   5. On calcule un score de visibilité par acteur (0-100).
 *   6. On demande à Claude un commentaire d'analyse global (2-3 phrases).
 *
 * Coût : ~$0.03 par scan (5 Perplexity + 2 Claude).
 */

import { callClaudeJson } from './claude'
import { retryable } from './retry'

const PERPLEXITY_API = 'https://api.perplexity.ai/chat/completions'
const PERPLEXITY_MODEL = 'sonar'
const PERPLEXITY_TIMEOUT_MS = 30_000
const NB_QUESTIONS = 5
// Tarif Perplexity sonar (au 25/05/2026) : ~$1/1M input et output tokens.
const PERPLEXITY_PRICE_PER_M = 1

export interface GeoVisibilityEntry {
  domain: string
  label: string
  mentions: number
  questions_appeared_in: number
  visibility_score: number
  /** Position dans le classement de visibilité (1 = le plus visible). */
  rank: number
}

export interface GeoCitationsResult {
  questions_asked: string[]
  /** Visibilité du site cible + chaque concurrent. */
  visibility: GeoVisibilityEntry[]
  /** Commentaire global de l'IA (2-3 phrases). */
  insights: string
  costUsd: number
}

interface ActorInput {
  /** Domaine sans http ni www. */
  domain: string
  /** Nom affiché. */
  label: string
}

export async function analyzeGeoCitations(
  target: { domain: string; label: string; sector: string; zone: string },
  competitors: ActorInput[],
  langue: string = 'fr',
): Promise<GeoCitationsResult> {
  console.log(
    `[GEO] START target=${target.domain} sector="${target.sector}" zone=${target.zone} competitors=${competitors.length}`,
  )

  // 1. Générer les questions types via Claude (en EXCLUANT le nom du site cible
  //    pour éviter le biais : "alternative à X" cite mécaniquement X).
  const { questions, cost: qCost } = await generateQuestions(
    target.sector,
    target.zone,
    target.label,
    target.domain,
    langue,
  )
  console.log(`[GEO] generated ${questions.length} questions`)

  // 2. Pour chaque question : Perplexity en parallèle
  const settled = await Promise.allSettled(
    questions.map((q) => askPerplexity(q)),
  )
  let perplexityCost = 0
  const responses: PerplexityResponse[] = []
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      perplexityCost += r.value.cost
      responses.push(r.value)
    } else {
      console.warn(
        `[GEO] question ${i + 1} failed: ${r.reason instanceof Error ? r.reason.message : r.reason}`,
      )
    }
  })
  console.log(
    `[GEO] perplexity ok=${responses.length}/${questions.length} cost=$${perplexityCost.toFixed(4)}`,
  )

  // 3-5. Compter les mentions par acteur
  const allActors: ActorInput[] = [
    { domain: target.domain, label: target.label },
    ...competitors,
  ]
  const visibility = computeVisibility(allActors, responses)

  // 6. Insights globaux via Claude
  const { insights, cost: iCost } = await generateInsights(
    target,
    visibility,
    questions,
    langue,
  )

  const totalCost = qCost + perplexityCost + iCost
  console.log(
    `[GEO] DONE total cost=$${totalCost.toFixed(4)} target_visibility=${visibility.find((v) => v.domain === target.domain)?.visibility_score ?? 0}`,
  )

  return {
    questions_asked: questions,
    visibility,
    insights,
    costUsd: totalCost,
  }
}

// ------------------------------------------------------------
// Step 1 : générer les questions types
// ------------------------------------------------------------

async function generateQuestions(
  sector: string,
  zone: string,
  targetLabel: string,
  targetDomain: string,
  langue: string,
): Promise<{ questions: string[]; cost: number }> {
  // Extraire les variantes du nom à exclure (label, domain sans TLD, domain sans www)
  const brandVariants = [
    targetLabel,
    targetDomain,
    targetDomain.replace(/^www\./, ''),
    targetDomain.split('.')[0],
  ].filter((v, i, arr) => v && arr.indexOf(v) === i)

  const prompt = `Tu es un client potentiel qui cherche une solution dans le secteur "${sector}" dans la zone "${zone}".

Génère ${NB_QUESTIONS} questions concrètes que tu poserais à ChatGPT / Perplexity / Gemini pour trouver et comparer les acteurs de ce secteur.

⚠️ RÈGLE CRITIQUE : tu NE DOIS JAMAIS mentionner les noms suivants dans tes questions : ${brandVariants.map((v) => `"${v}"`).join(', ')}. C'est le site qu'on cherche à MESURER. Si tu le mentionnes dans la question, le résultat sera biaisé (l'IA citera mécaniquement ce nom dans sa réponse, faussant la mesure). Pose tes questions comme un prospect qui ne connaît PAS encore ce site, et cherche des solutions par BESOIN, pas par marque.

Les questions doivent être :
- réalistes (ce que taperait un vrai client qui découvre le secteur)
- spécifiques à la zone "${zone}"
- formulées ${langue === 'fr' ? 'en français naturel' : `en ${langue}`}
- centrées sur le BESOIN ou le SERVICE, jamais sur une marque connue

Exemples du genre attendu :
- "Quel est le meilleur [type d'acteur] à [ville/région] ?"
- "Où puis-je trouver [service/produit] en [zone] ?"
- "[Service] pas cher [zone] : quelles options ?"
- "Comparatif des [type d'acteurs] de [zone]"
- "Recommandations pour [problème concret] [zone]"

Réponds UNIQUEMENT en JSON valide :
{
  "questions": ["...", "...", "...", "...", "..."]
}`

  const { json, costUsd } = await callClaudeJson<{ questions: string[] }>({
    prompt,
    maxTokens: 600,
    label: 'geo:questions',
  })
  return {
    questions: Array.isArray(json.questions)
      ? json.questions.map(String).slice(0, NB_QUESTIONS)
      : [],
    cost: costUsd,
  }
}

// ------------------------------------------------------------
// Step 2 : interroger Perplexity
// ------------------------------------------------------------

interface PerplexityResponse {
  question: string
  content: string
  citations: string[]
  cost: number
}

async function askPerplexity(question: string): Promise<PerplexityResponse> {
  return retryable(() => askPerplexityOnce(question), 'Perplexity')
}

async function askPerplexityOnce(question: string): Promise<PerplexityResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY env var requise')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(PERPLEXITY_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          {
            role: 'user',
            content: question,
          },
        ],
        max_tokens: 600,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Perplexity fetch failed: ${msg}`)
  }
  clearTimeout(timeout)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Perplexity HTTP ${res.status}: ${text.slice(0, 300)}`)
  }

  const body = (await res.json()) as {
    choices: { message: { content: string } }[]
    citations?: string[]
    usage: { prompt_tokens: number; completion_tokens: number }
  }
  const content = body.choices?.[0]?.message?.content ?? ''
  const citations = body.citations ?? []
  const cost =
    ((body.usage?.prompt_tokens ?? 0) + (body.usage?.completion_tokens ?? 0)) /
    1_000_000 *
    PERPLEXITY_PRICE_PER_M

  return { question, content, citations, cost }
}

// ------------------------------------------------------------
// Step 3-5 : calcul visibilité
// ------------------------------------------------------------

function computeVisibility(
  actors: ActorInput[],
  responses: PerplexityResponse[],
): GeoVisibilityEntry[] {
  const tally = new Map<
    string,
    { mentions: number; questionsAppeared: Set<number> }
  >()
  actors.forEach((a) => {
    tally.set(a.domain, {
      mentions: 0,
      questionsAppeared: new Set(),
    })
  })

  responses.forEach((r, qIdx) => {
    const haystack = `${r.content}\n${r.citations.join('\n')}`.toLowerCase()
    actors.forEach((a) => {
      const needle = a.domain.toLowerCase().replace(/^www\./, '')
      const variants = [needle, needle.split('.')[0]] // ex : amazon.fr + "amazon"
      let matchedThisQuestion = false
      let mentionsThisQuestion = 0
      for (const v of variants) {
        // mention par occurrence
        const safe = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const re = new RegExp(`\\b${safe}\\b`, 'gi')
        const matches = haystack.match(re)
        if (matches) {
          mentionsThisQuestion += matches.length
          matchedThisQuestion = true
        }
      }
      const entry = tally.get(a.domain)
      if (entry && matchedThisQuestion) {
        entry.mentions += mentionsThisQuestion
        entry.questionsAppeared.add(qIdx)
      }
    })
  })

  const totalQuestions = responses.length || 1
  const max = Math.max(
    1,
    ...[...tally.values()].map((t) => t.mentions),
  )

  const visibility: GeoVisibilityEntry[] = actors.map((a) => {
    const t = tally.get(a.domain)!
    const mentions = t.mentions
    const questionsCovered = t.questionsAppeared.size
    // Score : 60% normalisé mentions, 40% % questions où l'acteur apparaît
    const score = Math.round(
      0.6 * (mentions / max) * 100 +
        0.4 * (questionsCovered / totalQuestions) * 100,
    )
    return {
      domain: a.domain,
      label: a.label,
      mentions,
      questions_appeared_in: questionsCovered,
      visibility_score: score,
      rank: 0, // sera défini après tri
    }
  })

  visibility.sort((a, b) => b.visibility_score - a.visibility_score)
  visibility.forEach((v, i) => {
    v.rank = i + 1
  })
  return visibility
}

// ------------------------------------------------------------
// Step 6 : insights globaux
// ------------------------------------------------------------

async function generateInsights(
  target: { domain: string; label: string; sector: string; zone: string },
  visibility: GeoVisibilityEntry[],
  questions: string[],
  langue: string,
): Promise<{ insights: string; cost: number }> {
  const targetEntry = visibility.find((v) => v.domain === target.domain)
  const topVisible = visibility.slice(0, 5)
  const topBlock = topVisible
    .map(
      (v) =>
        `- ${v.label} (${v.domain}) : score ${v.visibility_score}/100, ${v.mentions} mentions sur ${v.questions_appeared_in}/${questions.length} questions`,
    )
    .join('\n')

  const prompt = `Analyse la visibilité du site cible dans les réponses des moteurs IA (Perplexity / ChatGPT-like).

SITE CIBLE : ${target.label} (${target.domain})
- Score visibilité IA : ${targetEntry?.visibility_score ?? 0}/100
- Rang : ${targetEntry?.rank ?? '?'} sur ${visibility.length}
- Mentions : ${targetEntry?.mentions ?? 0} sur ${visibility.reduce((a, b) => a + b.mentions, 0)} totales

TOP 5 ACTEURS LES PLUS VISIBLES :
${topBlock}

QUESTIONS POSÉES :
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Produis ${langue === 'fr' ? 'en français' : `en ${langue}`} 2 à 3 phrases qui répondent à ces 3 questions :
1. Le site cible est-il visible dans les réponses IA ? (oui/non + pourquoi)
2. Qui domine vraiment cette visibilité IA dans ce secteur ?
3. Quel est le levier #1 pour améliorer la visibilité IA du site cible ?

Sois direct, concret, sans jargon. Pas de blabla.

Réponds UNIQUEMENT en JSON valide :
{
  "insights": "..."
}`

  const { json, costUsd } = await callClaudeJson<{ insights: string }>({
    prompt,
    maxTokens: 500,
    label: 'geo:insights',
  })
  return { insights: String(json.insights ?? ''), cost: costUsd }
}
