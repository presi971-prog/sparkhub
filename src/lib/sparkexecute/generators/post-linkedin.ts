/**
 * SparkExecute — générateur de post LinkedIn (pack complet texte + image).
 *
 * Pourquoi : LinkedIn = canal n°1 pour parler à des décideurs TPE/PME GP.
 * Le post court, en format Hook-Story-CTA, est le format qui performe le mieux
 * sur LinkedIn 2025 (cf. Justin Welsh, Nate Herk).
 *
 * Pack complet : depuis V1.1 le générateur produit le texte du post ET l'image
 * d'accompagnement, en chaînant Claude (texte + prompt image) puis Nano Banana
 * (image). Si Nano Banana échoue, on garde le texte et on remplit `image_error`
 * pour que l'UI propose à l'user de générer l'image manuellement.
 *
 * Contraintes :
 *   - Limite "premier-pli" LinkedIn = ~210 caractères affichés avant "Voir plus"
 *   - Limite totale du post = 1300 caractères (LinkedIn coupe au-delà)
 *   - Pas de markdown (LinkedIn affiche tout en texte plat)
 *   - Sauts de ligne pour structurer visuellement
 */

import { callClaudeText } from '../claude-text'
import { resolveBrandProfile, buildR0ZeroInvention } from '../brand'
import {
  generateAndStoreImage,
  NANO_BANANA_PRO_USD_PER_IMAGE,
} from './image-pipeline'
import type { RunInputBrief, RunOutput } from '../types'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

const MAX_CHARACTERS = 1300
const DEFAULT_FRAMEWORK = 'Hook-Story-CTA'

export async function generatePostLinkedIn(
  brief: RunInputBrief,
  task?: SparkpilotTask | null,
): Promise<{ output: RunOutput; cost: { usd: number; inputTokens: number; outputTokens: number }; frameworkUsed: string }> {
  const framework =
    brief.framework_override ?? task?.metadata?.framework_used ?? DEFAULT_FRAMEWORK

  const prompt = buildPrompt(brief, framework, task)

  const result = await callClaudeText({
    prompt,
    maxTokens: 2000,
    label: 'sparkexecute-post-linkedin',
  })

  // Nettoyage : LinkedIn ne supporte pas le markdown, donc on retire les
  // éventuels backticks / hashes que Claude aurait ajoutés par habitude.
  let cleaned = result.text
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Sépare le post, les hashtags et le prompt image générés par Claude.
  const { mainText, imagePrompt, hashtags } = splitTrailingBlocks(cleaned)
  cleaned = mainText

  // Clamp au cas où Claude dépasserait.
  const truncated = cleaned.length > MAX_CHARACTERS
    ? cleaned.slice(0, MAX_CHARACTERS - 1).trimEnd() + '…'
    : cleaned

  const firstLine = truncated.split('\n').find((l) => l.trim().length > 0) ?? ''

  // ============================================================
  // Step 2 : génération de l'image (best-effort).
  // Si Nano Banana échoue, on garde le texte et on signale image_error.
  // ============================================================
  const altText = `Illustration pour le post LinkedIn : ${brief.sujet}`.slice(0, 125)
  let imageUrl: string | undefined
  let imageError: string | undefined
  let imageCostUsd = 0

  if (imagePrompt && imagePrompt.length > 0) {
    try {
      imageUrl = await generateAndStoreImage(imagePrompt, '1:1')
      imageCostUsd = NANO_BANANA_PRO_USD_PER_IMAGE
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      imageError = `Impossible de générer l'image automatiquement (${msg}). Tu peux en créer une manuellement via le type Visuel.`
      console.warn('[SparkExecute] post-linkedin image generation failed:', msg)
    }
  } else {
    imageError = "Impossible de générer l'image automatiquement. Tu peux en créer une manuellement via le type Visuel."
  }

  return {
    output: {
      content: truncated,
      hashtags,
      image_url: imageUrl,
      alt_text: imageUrl ? altText : undefined,
      image_error: imageError,
      metadata: {
        character_count: truncated.length,
        hook_first_line: firstLine.slice(0, 210),
        image_prompt: imagePrompt,
        framework_used: framework,
      },
    },
    cost: {
      usd: result.costUsd + imageCostUsd,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
    frameworkUsed: framework,
  }
}

// ============================================================
// Helpers
// ============================================================

function buildPrompt(
  brief: RunInputBrief,
  framework: string,
  task?: SparkpilotTask | null,
): string {
  const brand = resolveBrandProfile(brief.brand)
  const audience = brief.audience?.trim() || brand.audienceDefault
  const ton = brief.ton?.trim() || 'chaleureux et direct (tutoiement)'
  const motsCles = (brief.mots_cles ?? []).filter((m) => m && m.trim()).slice(0, 6)
  const variant = describeVariant(brief.variant)

  const taskContext = task
    ? `[CONTEXTE DE LA TÂCHE PARENTE SPARKPILOT]
Ce post a été demandé pour avancer la tâche suivante :
- Titre : ${task.title}
- Description : ${task.description ?? '(pas de description)'}
- Priorité stratégique : ${task.priority_index}

`
    : ''

  return `[RÔLE]
Tu es le copywriter LinkedIn senior qui écrit AU NOM DE ${brand.name}.
Tu rédiges un post LinkedIn qui CARTONNE sur LinkedIn 2025-2026.
Public visé : ${audience}.

[R0 ABSOLUES — NE PAS DÉROGER]

${buildR0ZeroInvention(brand)}

${brand.anchoringRules}

R0 #2 — STRUCTURE HOOK-STORY-CTA (format premier-pli LinkedIn 2026)
1. HOOK (1ère ligne, max 200 caractères) : doit DONNER ENVIE de cliquer "Voir plus".
   - Question provocante, chiffre fort, contradiction, mini-cliffhanger.
   - INTERDIT de commencer par "Je..." ou "Aujourd'hui je veux vous parler de..."
   - Le hook doit être adapté à l'audience ci-dessus et au sujet — accroche
     forte, concrète, sans cliché ni promesse inventée.

2. STORY (le milieu, 3 à 6 paragraphes courts) :
   - Situation concrète et parlante — SANS inventer de faux témoignage ni de
     retour client fictif (cf. R0 #0). Un scénario hypothétique assumé est OK.
   - Phrases courtes. UN saut de ligne entre chaque idée pour aérer.
   - Si tu cites un chiffre, il doit être réel et fiable ; sinon reste
     qualitatif. Ne JAMAIS inventer de nombre pour "faire sérieux".

3. CTA (dernier paragraphe) : invite à UNE seule action.
   - Pas de "n'hésitez pas à...". Donne un verbe d'action clair.
   - Ex : "Dis-moi en commentaire ce que tu en penses."
   - Ex : "Si tu veux qu'on en parle, envoie-moi un message."

R0 #3 — CONTRAINTES TECHNIQUES LINKEDIN
- TEXTE PLAT uniquement (pas de markdown : pas de **, pas de _, pas de #).
- Sauts de ligne pour structurer (chaque idée = 1 ligne, paragraphes = blocs).
- ÉMOJIS : 0 à 3 maximum, jamais en début de hook, jamais 2 d'affilée.
- LONGUEUR TOTALE : 600 à 1200 caractères (clamp dur à 1300).

R0 #4 — TON ET CIBLE
- Audience : ${audience}
- Ton : ${ton}
${variant ? `- Variante : ${variant}` : ''}
- Écris pour l'audience ci-dessus : pas de jargon inutile, ton adapté à ce public.

R0 #5 — FRAMEWORK GUIDE : ${framework}
${frameworkGuidance(framework)}

${
  motsCles.length > 0
    ? `R0 #6 — MOTS-CLÉS À INTÉGRER NATURELLEMENT (1 fois chacun max) :\n${motsCles.map((m) => `  - "${m}"`).join('\n')}\n`
    : ''
}
[BRIEF]
- Sujet du post : ${brief.sujet}

${taskContext}[FORMAT DE RÉPONSE — RESPECTE-LE À LA LETTRE]
1) D'abord, écris le post LinkedIn (texte plat, prêt à coller), et RIEN d'autre.
2) Puis, APRÈS le post, ajoute ces DEUX blocs, chacun encadré par ses balises
   EXACTES sur leur propre ligne. N'écris JAMAIS "BLOC 1/2/3", n'omets JAMAIS
   les balises :

---IMAGE_PROMPT---
(prompt DÉTAILLÉ en ANGLAIS pour Nano Banana décrivant l'image éditoriale
CARRÉE 1:1 qui accompagne le post. Univers visuel imposé : ${brand.imageStyle}
JAMAIS de texte/logo incrusté. 3 à 6 lignes, style
"Professional editorial photograph, hyperrealistic. Subject: ... Setting: ...
Light: ...".)
---END_IMAGE_PROMPT---

---HASHTAGS---
(3 à 5 hashtags pertinents séparés par des espaces, sans le #)
---END_HASHTAGS---

⚠️ Le bloc ---IMAGE_PROMPT--- est OBLIGATOIRE : sans lui, le post n'a pas
d'image. Pas d'introduction ni de conclusion meta.`
}

function frameworkGuidance(framework: string): string {
  const fw = framework.toLowerCase()
  if (fw.includes('hook') && fw.includes('story') && fw.includes('cta')) {
    return `Justin Welsh - format Hook-Story-CTA : un hook fort qui passe le premier-pli,
une story qui crée de l'empathie ou du "ah ouais !", un CTA simple.`
  }
  if (fw.includes('aida')) {
    return `AIDA : Attention (hook) → Intérêt (chiffres / promesse) → Désir (story client)
→ Action (CTA clair).`
  }
  if (fw.includes('pas')) {
    return `PAS : Problem (le problème que vit le lecteur) → Agitation (pourquoi c'est
pénible) → Solution (ce que tu proposes). Termine par un CTA.`
  }
  return `Adapte au mieux pour un post LinkedIn qui retient l'attention dès la 1ère ligne.`
}

function describeVariant(variant: RunInputBrief['variant']): string {
  switch (variant) {
    case 'shorter':
      return 'Version PLUS COURTE (vise 500-700 caractères au lieu de 1000+).'
    case 'punchier':
      return 'Ton TRÈS DIRECT, accroche-choc, phrases brèves.'
    case 'pro':
      return 'Ton PLUS INSTITUTIONNEL, vouvoiement, registre soutenu.'
    case 'casual':
      return 'Ton TRÈS DÉTENDU, "tu" partout, langage parlé.'
    default:
      return ''
  }
}

/**
 * Sépare le texte principal des blocs annexes (hashtags, prompt image) qui
 * suivent un séparateur `---`.
 */
function splitTrailingBlocks(text: string): {
  mainText: string
  imagePrompt: string | null
  hashtags: string[]
} {
  // Parsing ROBUSTE par balises explicites (même approche que article-seo, qui
  // marche de façon fiable). On ne dépend plus du fait que le modèle "labellise"
  // bien chaque bloc — on cherche des délimiteurs exacts.
  const imgMatch = text.match(
    /---IMAGE_PROMPT---\s*([\s\S]*?)\s*---END_IMAGE_PROMPT---/i,
  )
  const tagMatch = text.match(
    /---HASHTAGS---\s*([\s\S]*?)\s*---END_HASHTAGS---/i,
  )

  const imagePrompt = imgMatch ? imgMatch[1].trim() || null : null
  const hashtags = tagMatch
    ? tagMatch[1]
        .split(/\s+|,/)
        .map((w) => w.replace(/^#+/, '').trim())
        .filter((w) => w.length > 0)
        .slice(0, 5)
    : []

  // Le texte du post = tout ce qui précède le 1er bloc balisé.
  let mainText = text
  const firstDelim = text.search(/---(?:IMAGE_PROMPT|HASHTAGS)---/i)
  if (firstDelim > 0) mainText = text.slice(0, firstDelim)
  // Filet de sécurité : si le modèle a oublié les balises de fin, on retire
  // toute balise résiduelle qui traînerait dans le texte.
  mainText = mainText
    .replace(/---(?:IMAGE_PROMPT|END_IMAGE_PROMPT|HASHTAGS|END_HASHTAGS)---/gi, '')
    .trim()

  return { mainText, imagePrompt, hashtags }
}
