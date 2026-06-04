/**
 * SparkExecute — générateur de post Instagram (pack complet caption + image).
 *
 * Pourquoi : Instagram = canal n°2 pour les TPE/PME GP (commerces, ostéos,
 * restaurants, food trucks…). Format carré 1:1, caption courte et aesthetic,
 * 10-15 hashtags ciblés.
 *
 * Pack complet :
 *   1. Claude génère la caption Instagram + un prompt image détaillé en anglais.
 *   2. Nano Banana génère l'image carrée (1080×1080) via le pipeline mutualisé.
 *   3. Si l'image échoue : on garde la caption et on remplit `image_error` pour
 *      que l'UI propose à l'user de la générer manuellement.
 *
 * Contraintes Instagram :
 *   - Caption max 2200 caractères, mais sweet spot 150-400 caractères.
 *   - 10-15 hashtags (Meta a confirmé 2024 que c'est l'optimum, plus = moins de portée).
 *   - Pas de markdown (Instagram affiche tout en texte plat).
 *   - Émojis bienvenus (1 à 5 max, espacés).
 *   - Première ligne = accroche visible avant le "... plus" (premier-pli ~125 char).
 */

import { callClaudeText } from '../claude-text'
import { PUBLISH_BRAND_NAME, R0_ZERO_INVENTION } from '../brand'
import {
  generateAndStoreImage,
  NANO_BANANA_PRO_USD_PER_IMAGE,
} from './image-pipeline'
import type { RunInputBrief, RunOutput } from '../types'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

const MAX_CHARACTERS = 2200
const DEFAULT_FRAMEWORK = 'Native format first'

export async function generatePostInstagram(
  brief: RunInputBrief,
  task?: SparkpilotTask | null,
): Promise<{ output: RunOutput; cost: { usd: number; inputTokens: number; outputTokens: number }; frameworkUsed: string }> {
  const framework =
    brief.framework_override ?? task?.metadata?.framework_used ?? DEFAULT_FRAMEWORK

  const aspectRatioForPrompt: '1:1' | '4:5' = brief.aspect_ratio === '1:1' ? '1:1' : '4:5'
  const prompt = buildPrompt(brief, framework, task, aspectRatioForPrompt)

  const result = await callClaudeText({
    prompt,
    maxTokens: 2000,
    label: 'sparkexecute-post-instagram',
  })

  // Nettoyage : Instagram ne supporte pas le markdown.
  let cleaned = result.text
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Sépare la caption, les hashtags et le prompt image.
  const { mainText, imagePrompt, hashtags } = splitTrailingBlocks(cleaned)
  cleaned = mainText

  // Clamp au cas où Claude dépasserait.
  const truncated = cleaned.length > MAX_CHARACTERS
    ? cleaned.slice(0, MAX_CHARACTERS - 1).trimEnd() + '…'
    : cleaned

  const firstLine = truncated.split('\n').find((l) => l.trim().length > 0) ?? ''

  // ============================================================
  // Step 2 : génération de l'image (best-effort).
  // Format : 4:5 (portrait) par défaut pour Instagram feed, 1:1 si demandé.
  // ============================================================
  const aspectRatio = aspectRatioForPrompt
  const dimensions = aspectRatio === '4:5'
    ? { width: 1080, height: 1350 }
    : { width: 1080, height: 1080 }
  const altText = `Visuel Instagram : ${brief.sujet}`.slice(0, 125)
  let imageUrl: string | undefined
  let imageError: string | undefined
  let imageCostUsd = 0

  if (imagePrompt && imagePrompt.length > 0) {
    try {
      imageUrl = await generateAndStoreImage(imagePrompt, aspectRatio)
      imageCostUsd = NANO_BANANA_PRO_USD_PER_IMAGE
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      imageError = `Impossible de générer l'image automatiquement (${msg}). Tu peux en créer une manuellement via le type Visuel.`
      console.warn('[SparkExecute] post-instagram image generation failed:', msg)
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
        hook_first_line: firstLine.slice(0, 125),
        image_prompt: imagePrompt,
        framework_used: framework,
        aspect_ratio: aspectRatio,
        generated_width: dimensions.width,
        generated_height: dimensions.height,
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
  aspectRatio: '1:1' | '4:5' = '4:5',
): string {
  const audience = brief.audience?.trim() || 'patrons de TPE/PME en Guadeloupe'
  const ton = brief.ton?.trim() || 'chaleureux, visuel, énergique (tutoiement)'
  const motsCles = (brief.mots_cles ?? []).filter((m) => m && m.trim()).slice(0, 6)
  const variant = describeVariant(brief.variant)
  const imageFormatLine = aspectRatio === '4:5'
    ? "vertical portrait 4:5 (1080×1350), cadrage Instagram feed optimisé."
    : "carré 1:1 (1080×1080), cadrage universel."

  const taskContext = task
    ? `[CONTEXTE DE LA TÂCHE PARENTE SPARKPILOT]
Ce post a été demandé pour avancer la tâche suivante :
- Titre : ${task.title}
- Description : ${task.description ?? '(pas de description)'}
- Priorité stratégique : ${task.priority_index}

`
    : ''

  return `[RÔLE]
Tu es le copywriter Instagram senior qui écrit AU NOM DE ${PUBLISH_BRAND_NAME}.
Tu rédiges une caption Instagram qui CARTONNE pour des TPE/PME en Guadeloupe
en 2025-2026.

[R0 ABSOLUES — NE PAS DÉROGER]

${R0_ZERO_INVENTION}

R0 #1 — ANCRAGE GUADELOUPE
- Références, lieux, exemples : Guadeloupe (Pointe-à-Pitre, Le Gosier,
  Saint-François, Basse-Terre, Marie-Galante…).
- Marché ~400 000 habitants, communauté tissée, WhatsApp > SMS.
- INTERDIT : exemples "métro", "rue grise européenne", "froid".

R0 #2 — STRUCTURE INSTAGRAM (caption qui retient)
1. PREMIER-PLI (1ère ligne, max 125 caractères) :
   - Accroche visuelle ou émotionnelle, donne envie de cliquer "... plus".
   - INTERDIT de commencer par "Aujourd'hui..." ou "Bonjour à tous...".
   - Exemples qui marchent :
     * "Ce qui se passe le dimanche matin à Sainte-Anne 👇"
     * "Le secret des resto qui font le plein tous les soirs."
     * "150 €/mois pour ça ? Sérieux ?"

2. CŒUR DE CAPTION (150 à 400 caractères au total, sweet spot) :
   - Une seule idée bien servie.
   - Phrases TRÈS courtes (Instagram = lecture rapide).
   - 1 à 3 émojis max, espacés, jamais 2 d'affilée.
   - Sauts de ligne pour aérer (chaque idée = 1 ligne).

3. CTA (dernière ligne) : invite à UNE seule action.
   - Ex : "Tag un proche qui en a besoin."
   - Ex : "Envoie-nous un DM pour en savoir +."
   - Ex : "Sauvegarde ce post pour plus tard."

R0 #3 — CONTRAINTES TECHNIQUES INSTAGRAM
- TEXTE PLAT uniquement (pas de markdown : pas de **, pas de _).
- Les hashtags ne vont PAS dans la caption (bloc séparé, on les place en
  premier commentaire ou en fin de caption selon stratégie).
- LONGUEUR CAPTION : 150 à 400 caractères idéalement (clamp dur à 2200).

R0 #4 — TON ET CIBLE
- Audience : ${audience}
- Ton : ${ton}
${variant ? `- Variante : ${variant}` : ''}
- Tutoiement, pas de jargon. On parle à un patron de TPE, pas à un growth hacker.

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
1) D'abord, écris la caption Instagram (texte plat, prêt à coller), RIEN d'autre.
2) Puis, APRÈS la caption, ajoute ces DEUX blocs, chacun encadré par ses balises
   EXACTES sur leur propre ligne. N'écris JAMAIS "BLOC 1/2/3", n'omets JAMAIS
   les balises :

---IMAGE_PROMPT---
(prompt DÉTAILLÉ en ANGLAIS pour Nano Banana décrivant l'image éditoriale.
FORMAT IMAGE OBLIGATOIRE : ${imageFormatLine}
Esthétique Instagram : couleurs vibrantes mais naturelles, lumière chaude,
cadrage Instagrammable. Ancrage Guadeloupe : palmiers, façades colorées de
l'architecture locale, lumière dorée. JAMAIS de pull/col roulé, de rue grise
européenne, ni de texte/logo incrusté. 3 à 6 lignes, style "Professional
editorial photograph, hyperrealistic, ${aspectRatio === '4:5' ? 'vertical portrait 4:5 format' : 'square 1:1 format'}. Subject: ... Setting: ... Light: ...".)
---END_IMAGE_PROMPT---

---HASHTAGS---
(10 à 15 hashtags pertinents séparés par des espaces, sans le #. Mélange larges
et niches, ex : #guadeloupe #971 #restoguadeloupe #tpegp #patronsgp)
---END_HASHTAGS---

⚠️ Le bloc ---IMAGE_PROMPT--- est OBLIGATOIRE : sans lui, le post n'a pas
d'image. Pas d'introduction ni de conclusion meta.`
}

function frameworkGuidance(framework: string): string {
  const fw = framework.toLowerCase()
  if (fw.includes('native format')) {
    return `Native format first : la caption sert le visuel, elle ne le décrit pas.
Le visuel parle, la caption ajoute du contexte court et un CTA.`
  }
  if (fw.includes('hook') && fw.includes('story') && fw.includes('cta')) {
    return `Hook-Story-CTA : un hook visuel en 1ère ligne, une micro-story émotionnelle,
un CTA d'action.`
  }
  if (fw.includes('aida')) {
    return `AIDA : Attention (hook visuel) → Intérêt (chiffres / promesse) → Désir
(émotion concrète) → Action (CTA clair).`
  }
  return `Adapte au mieux pour une caption Instagram qui retient l'attention dès la 1ère ligne.`
}

function describeVariant(variant: RunInputBrief['variant']): string {
  switch (variant) {
    case 'shorter':
      return 'Version PLUS COURTE (vise 80-150 caractères au lieu de 300+).'
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
 * Sépare la caption principale des blocs annexes (hashtags, prompt image)
 * qui suivent un séparateur `---`.
 */
function splitTrailingBlocks(text: string): {
  mainText: string
  imagePrompt: string | null
  hashtags: string[]
} {
  // Parsing ROBUSTE par balises explicites (même approche fiable que article-seo).
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
        .slice(0, 15)
    : []

  let mainText = text
  const firstDelim = text.search(/---(?:IMAGE_PROMPT|HASHTAGS)---/i)
  if (firstDelim > 0) mainText = text.slice(0, firstDelim)
  mainText = mainText
    .replace(/---(?:IMAGE_PROMPT|END_IMAGE_PROMPT|HASHTAGS|END_HASHTAGS)---/gi, '')
    .trim()

  return { mainText, imagePrompt, hashtags }
}
