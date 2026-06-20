/**
 * SparkScan — synthesizer (V0.6).
 *
 * Reçoit les concurrents qualifiés + enrichis + le cadrage client, et produit :
 *   - executive_summary : 1 phrase en haut du rapport pour les pressés
 *   - market_overview : 2-3 phrases sur l'état du marché
 *   - top3_priorities : 3 concurrents prioritaires, chacun avec :
 *       - lever            : "attaquer" | "copier" | "eviter" | "partenariat"
 *           (choisi par un arbre de décision sourcé Kotler/Blue Ocean/Coopétition)
 *       - lever_reason     : pourquoi ce levier précis (1 phrase)
 *       - tactical_action  : action concrète à mener
 *       - estimated_gain   : gain attendu (€ si possible, sinon "petit"/"moyen"/"gros")
 *       - estimated_cost   : coût (€ + heures)
 *       - kpi_30j          : indicateur mesurable pour valider sous 30j
 *       - who_does_it      : qui le fait (toi seul / toi + agence / délégation)
 *
 * Si le clientContext est fourni, l'IA calibre selon les ressources du client.
 * Si elle n'a pas les chiffres précis : elle DOIT écrire "estimation à valider"
 * au lieu d'inventer une certitude.
 *
 * 1 SEUL appel Claude → coût ~$0.03-0.04.
 */

import { callClaudeJson } from './claude'
import type { TargetContext, ClientContext } from './qualifier'
import type { CompetitorEnrichment } from './enricher'

export type StrategicLever = 'attaquer' | 'copier' | 'eviter' | 'partenariat'

export interface SynthesisInput {
  key: string
  label: string
  qualification: 'direct' | 'indirect'
  relevance_score: number
  reason: string
  enrichment: CompetitorEnrichment | null
}

export interface SynthesisPriority {
  /** key du concurrent visé. */
  competitor_key: string
  competitor_label: string
  /** Levier stratégique choisi (issu de l'arbre de décision). */
  lever: StrategicLever
  /** Pourquoi ce levier précis (1 phrase). */
  lever_reason: string
  /** Action concrète à mener. */
  tactical_action: string
  /** Gain estimé : soit montant € si possible, sinon "petit"/"moyen"/"gros" + courte justification. */
  estimated_gain: string
  /** Coût estimé : € + heures. */
  estimated_cost: string
  /** Indicateur mesurable à 30 jours. */
  kpi_30j: string
  /** Qui pilote l'action. */
  who_does_it: string
  /**
   * Re-check de cohérence (étape Phase B) : true si la priorité est validée
   * par une 2e passe Claude, false sinon. undefined = vérification non lancée.
   */
  verified?: boolean
  /** Si !verified : 1 phrase qui dit pourquoi (ex : "Acteur national, pas concurrent local DCG AI"). */
  verification_warning?: string
}

export interface StrategicSynthesis {
  executive_summary: string
  market_overview: string
  top3_priorities: SynthesisPriority[]
}

export async function generateSynthesis(
  target: TargetContext,
  competitors: SynthesisInput[],
  langue: string = 'fr',
): Promise<{ synthesis: StrategicSynthesis; costUsd: number }> {
  if (competitors.length === 0) {
    return {
      synthesis: {
        executive_summary: '',
        market_overview: '',
        top3_priorities: [],
      },
      costUsd: 0,
    }
  }

  console.log(`[Synthesizer] START competitors=${competitors.length}`)
  const prompt = buildSynthesisPrompt(target, competitors, langue)
  const { json, costUsd } = await callClaudeJson<StrategicSynthesis>({
    prompt,
    maxTokens: 3072,
    timeoutMs: 120_000, // 2 min — prompt riche avec 10 concurrents enrichis
    label: 'synthesizer',
  })
  const synthesis: StrategicSynthesis = {
    executive_summary: String(json.executive_summary ?? ''),
    market_overview: String(json.market_overview ?? ''),
    top3_priorities: (json.top3_priorities ?? [])
      .slice(0, 3)
      .map((p) => ({
        competitor_key: String(p.competitor_key ?? ''),
        competitor_label: String(p.competitor_label ?? ''),
        lever: normalizeLever(p.lever),
        lever_reason: String(p.lever_reason ?? ''),
        tactical_action: String(p.tactical_action ?? ''),
        estimated_gain: String(p.estimated_gain ?? ''),
        estimated_cost: String(p.estimated_cost ?? ''),
        kpi_30j: String(p.kpi_30j ?? ''),
        who_does_it: String(p.who_does_it ?? ''),
      })),
  }
  console.log(
    `[Synthesizer] DONE priorities=${synthesis.top3_priorities.length} levers=${synthesis.top3_priorities.map((p) => p.lever).join(',')} cost=$${costUsd.toFixed(4)}`,
  )
  return { synthesis, costUsd }
}

/**
 * Re-check Phase B : pour chaque priorité, on demande à Claude indépendamment
 * si le concurrent retenu est VRAIMENT pertinent comme priorité pour le site cible.
 *
 * Coût ~$0.01-0.02 (1 appel Claude court). Si une priorité ne tient pas, on garde
 * la priorité mais on l'annote (verification_warning) — l'UI affichera un badge.
 */
export async function verifyPriorities(
  target: TargetContext,
  priorities: SynthesisPriority[],
  langue: string = 'fr',
): Promise<{ priorities: SynthesisPriority[]; costUsd: number }> {
  if (priorities.length === 0) return { priorities, costUsd: 0 }

  console.log(`[Synthesizer/verify] START verifying ${priorities.length} priorities`)
  const langInstr =
    langue === 'fr' ? 'en français' : langue === 'en' ? 'in English' : `en ${langue}`

  const prompt = `Tu vérifies que les 3 priorités stratégiques générées sont VRAIMENT cohérentes avec le site cible.

SITE CIBLE :
- Domaine : ${target.domain}
- Secteur : ${target.sector || target.title || '(non renseigné)'}
- Zone : ${target.zone}

PRIORITÉS À VÉRIFIER :
${priorities
  .map(
    (p, i) =>
      `${i + 1}. Concurrent : ${p.competitor_label} (key="${p.competitor_key}")
   Levier : ${p.lever}
   Raison : ${p.lever_reason}
   Action : ${p.tactical_action}`,
  )
  .join('\n\n')}

Pour CHAQUE priorité (ordre identique), réponds :
- verified : true si CE CONCURRENT est cohérent comme priorité (vraiment concurrent du site cible, dans la même zone, avec le même type de service ou besoin client). false si tu détectes une incohérence (concurrent national pas local, métier totalement différent, etc.).
- verification_warning : ${langInstr}, 1 phrase MAX qui pointe l'incohérence si verified=false. Vide si verified=true.

Réponds UNIQUEMENT en JSON, sans backticks :
{
  "verifications": [
    { "verified": true|false, "verification_warning": "..." }
  ]
}`

  const { json, costUsd } = await callClaudeJson<{
    verifications: { verified: boolean; verification_warning?: string }[]
  }>({
    prompt,
    maxTokens: 1024,
    timeoutMs: 60_000,
    label: 'synthesizer:verify',
  })

  const verifs = json.verifications ?? []
  const verified = priorities.map((p, i) => {
    const v = verifs[i]
    return {
      ...p,
      verified: v?.verified === true,
      verification_warning:
        v?.verified === false ? String(v.verification_warning ?? '') : undefined,
    }
  })
  const failed = verified.filter((p) => p.verified === false).length
  console.log(
    `[Synthesizer/verify] DONE ${verified.length - failed}/${verified.length} priorités validées, ${failed} avec warning, cost=$${costUsd.toFixed(4)}`,
  )

  return { priorities: verified, costUsd }
}

function normalizeLever(raw: unknown): StrategicLever {
  const s = String(raw ?? '').toLowerCase().trim()
  if (s.startsWith('att')) return 'attaquer'
  if (s.startsWith('cop') || s.startsWith('imit')) return 'copier'
  if (s.startsWith('evi') || s.startsWith('avoi') || s.startsWith('niche')) return 'eviter'
  if (s.startsWith('part') || s.startsWith('coop')) return 'partenariat'
  return 'attaquer'
}

// ------------------------------------------------------------
// PROMPT BUILDER
// ------------------------------------------------------------

function buildSynthesisPrompt(
  target: TargetContext,
  competitors: SynthesisInput[],
  langue: string,
): string {
  const langInstr =
    langue === 'fr'
      ? 'en français naturel et direct (tutoiement)'
      : langue === 'en'
        ? 'in plain English (use "you")'
        : `en ${langue}`

  const compsBlock = competitors
    .map((c, i) => {
      const e = c.enrichment
      return `${i + 1}. ${c.label} (key="${c.key}") — qualification=${c.qualification} score=${c.relevance_score}
   Pertinence : ${c.reason}
   Positionnement : ${e?.positioning || '(non analysé)'}
   Forces : ${e?.strengths?.join(' / ') || '(non analysé)'}
   Faiblesses exploitables : ${e?.weaknesses?.join(' / ') || '(non analysé)'}`
    })
    .join('\n\n')

  const contextBlock = buildClientContextBlock(target.clientContext)

  return `Tu es directeur stratégique senior. Tu reçois l'analyse de ${competitors.length} concurrents du site ${target.domain} et tu dois sortir LE plan d'attaque opérationnel des 7 prochains jours.

CONTEXTE :
- Site cible : ${target.url} (${target.domain})
- Secteur : ${target.sector || '(à déduire)'}
- Zone : ${target.zone}
${contextBlock}

CONCURRENTS ANALYSÉS (qualifiés et enrichis) :
${compsBlock}

===========================================
PROCESSUS À SUIVRE STRICTEMENT
===========================================

ÉTAPE 1 — Choisis les 3 concurrents prioritaires
Critère : maximum d'impact business à 30-90 jours compte tenu des ressources du client.

ÉTAPE 2 — Pour CHACUN des 3 prioritaires, applique l'arbre de décision suivant pour choisir LE levier stratégique le plus rentable :

Q1. Ce concurrent a-t-il une FAILLE CLAIRE ET EXPLOITABLE par le client (compte tenu de ses ressources) ?
    → OUI : choisis "attaquer"
    → NON : passe à Q2.

Q2. Ce concurrent et le client ciblent-ils LES MÊMES CLIENTS ?
    → NON (faible recouvrement, possibilité de coexistence + complémentarité) : choisis "partenariat"
    → OUI : passe à Q3.

Q3. Le marché est-il encombré/saturé (marges qui s'érodent, surenchère permanente) ?
    → OUI : choisis "eviter" (changer de terrain, créer un sous-segment)
    → NON : passe à Q4.

Q4. Ce concurrent a-t-il une FORCE CLAIRE COPIABLE par le client sans risque juridique ni gros investissement ?
    → OUI : choisis "copier"
    → NON : choisis "attaquer" par défaut.

Sources de l'arbre : Kotler (challenger/follower/nicher) + Blue Ocean (Kim & Mauborgne) + Coopétition (Brandenburger & Nalebuff).

ÉTAPE 3 — Pour chaque priorité, produis un plan opérationnel COMPLET ${langInstr} :
- competitor_key : la key exacte du concurrent (recopie sans modifier)
- competitor_label : le nom commercial du concurrent
- lever : "attaquer" | "copier" | "eviter" | "partenariat" (en français exact, minuscules)
- lever_reason : 1 phrase qui explique POURQUOI ce levier (pas pourquoi ce concurrent)
- tactical_action : UNE action concrète à lancer cette semaine, avec verbe d'action, livrable mesurable. Pas générique.
- estimated_gain : Si tu peux estimer un € de CA ou un nombre (visites, leads, RDV), donne-le honnêtement en précisant "estimation à valider avec les vrais chiffres du client". Si tu ne peux pas chiffrer : "petit" | "moyen" | "gros" + 1 phrase qui justifie.
- estimated_cost : Coût en € ET en heures (ex : "300€ + 6h de ton temps", "0€ + 4h", "1500€ + 10h")
- kpi_30j : 1 indicateur mesurable sous 30 jours (ex : "Top 10 Google sur 3 requêtes ciblées", "5 RDV qualifiés via Maps", "15 leads inscrits via le partenariat")
- who_does_it : qui exécute (ex : "toi seul", "toi + rédacteur freelance", "agence SEO externe", "stagiaire marketing")

RÈGLES DE QUALITÉ STRICTES :
- INTERDIT d'inventer un chiffre que tu ne peux pas justifier. Si tu n'as pas l'info, écris "estimation à valider" honnêtement.
- INTERDIT de proposer une action qui dépasse le budget GLOBAL mensuel indiqué dans le cadrage client (s'il est fourni).
- DEUX budgets DISTINCTS à respecter séparément : (1) le budget PUBLICITÉ borne UNIQUEMENT la pub payante (Google Ads, Meta Ads, sponsoring) ; si le budget pub = 0€, INTERDIT ABSOLU de proposer la moindre pub payante — bascule tout sur l'organique/SEO/gratuit. (2) le budget GLOBAL borne le reste (outils, rédacteur freelance, etc.). Un budget pub à 0€ N'EMPÊCHE PAS de proposer un rédacteur freelance si le budget global le permet, et inversement.
- INTERDIT de mentionner des outils payants spécifiques que le client n'aurait pas (Semrush, Ahrefs, etc.) sauf si tu sais qu'il les a. Préfère Google Search Console (gratuit), ChatGPT, Tableur Google.
- INTERDIT de copier-coller les forces/faiblesses telles quelles : tu dois SYNTHÉTISER en action concrète.
- Si plusieurs concurrents mènent au même levier et à des actions très proches, c'est OK : ne force pas la diversité, sors la vraie meilleure réponse pour chacun.

ÉTAPE 4 — Produis aussi :
- executive_summary : 1 phrase qui résume LE plan global (l'angle d'attaque stratégique + bénéfice attendu à 30 jours). Pour un dirigeant pressé qui ne lira que cette ligne.
- market_overview : 2-3 phrases. Qui domine ? Quelle dynamique ? Où sont les ouvertures ?

===========================================
FORMAT DE RÉPONSE — JSON STRICT
===========================================

Réponds UNIQUEMENT en JSON valide, sans backticks, sans texte avant/après :

{
  "executive_summary": "...",
  "market_overview": "...",
  "top3_priorities": [
    {
      "competitor_key": "...",
      "competitor_label": "...",
      "lever": "attaquer|copier|eviter|partenariat",
      "lever_reason": "...",
      "tactical_action": "...",
      "estimated_gain": "...",
      "estimated_cost": "...",
      "kpi_30j": "...",
      "who_does_it": "..."
    }
  ]
}`
}

function buildClientContextBlock(ctx: ClientContext | undefined): string {
  if (!ctx) {
    return `- Cadrage client : (non renseigné — l'IA fait un plan générique adapté à une PME standard avec moyens modérés)`
  }
  const obj = {
    acquisition: 'Acquisition de nouveaux clients',
    fidelisation: 'Fidélisation et rétention de la clientèle existante',
    differenciation: 'Différenciation face à la concurrence (image, positionnement)',
    defense: 'Défense des parts de marché actuelles contre les attaques concurrentes',
  }[ctx.objective]

  const team = {
    solo: 'Solo (1 personne — peu de bande passante exécution)',
    '2-5': 'Équipe 2 à 5 personnes (bande passante modérée)',
    '5+': 'Équipe 5+ personnes (vraie capacité d\'exécution)',
  }[ctx.team_size]

  const budget = {
    none: '0€/mois (AUCUN budget global : uniquement des actions 100% gratuites / DIY, zéro outil payant, zéro freelance rémunéré)',
    under_500: 'moins de 500€/mois (budget très serré, privilégier les actions gratuites ou DIY)',
    '500_2000': '500€ à 2000€/mois (budget modéré, actions ciblées avec un peu d\'externalisation)',
    '2000_plus': 'plus de 2000€/mois (vraie capacité d\'investissement marketing)',
  }[ctx.monthly_budget]

  const adBudget = {
    none: '0€/mois (AUCUNE publicité payante : INTERDIT de proposer Google Ads, Meta Ads, ou toute pub payante — uniquement organique / SEO / gratuit)',
    under_300: 'moins de 300€/mois (petites campagnes pub de test seulement)',
    '300_1000': '300€ à 1000€/mois (campagnes pub ciblées possibles)',
    '1000_plus': 'plus de 1000€/mois (vraie capacité d\'achat média publicitaire)',
  }[ctx.ad_budget ?? 'none']

  const hz = {
    '30j': '30 jours (résultats attendus très court terme)',
    '90j': '90 jours (3 mois — horizon normal pour SEO et campagnes)',
    '6m': '6 mois (horizon long terme, investissement structurant possible)',
  }[ctx.horizon]

  return `- Cadrage client (renseigné avant le scan, à RESPECTER absolument) :
   • Objectif principal : ${obj}
   • Équipe disponible : ${team}
   • Budget GLOBAL mensuel (outils, rédacteur, freelance) : ${budget}
   • Budget PUBLICITÉ mensuel (Google/Meta Ads) : ${adBudget}
   • Horizon visé : ${hz}`
}
