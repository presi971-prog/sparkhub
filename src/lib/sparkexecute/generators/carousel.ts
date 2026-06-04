/**
 * SparkExecute — générateur de CARROUSEL (Instagram / LinkedIn).
 *
 * Un carrousel = une suite de slides (5 par défaut) qui racontent une histoire
 * Hook → valeur → CTA. Chaque slide est une IMAGE carrée avec du TEXTE intégré
 * (titre + sous-titre), générée par gpt-image-1 (le seul à rendre du texte net).
 *
 * Sortie :
 *   - content   = la légende (caption) du post
 *   - hashtags  = hashtags suggérés
 *   - image_url = la 1ère slide (couverture)
 *   - metadata.slides = [{ index, headline, subtext, image_url }]
 *
 * Coût : ~5 × $0.04 (gpt-image-1 medium) + ~$0.01 (Claude) ≈ $0.21 / carrousel.
 */

import { callClaudeText } from '../claude-text'
import {
  generateTextImageToBucket,
  ratioToGptSize,
  GPT_IMAGE_USD_PER_IMAGE,
} from './openai-image'
import type { RunInputBrief, RunOutput } from '../types'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

const NB_SLIDES = 5
const DEFAULT_FRAMEWORK = 'Hook-Story-CTA'

interface Slide {
  index: number
  headline: string
  subtext: string
  image_url?: string
}

export async function generateCarousel(
  brief: RunInputBrief,
  task?: SparkpilotTask | null,
): Promise<{
  output: RunOutput
  cost: { usd: number; inputTokens: number; outputTokens: number }
  frameworkUsed: string
}> {
  const framework =
    brief.framework_override ?? task?.metadata?.framework_used ?? DEFAULT_FRAMEWORK

  // 1) Claude conçoit la structure : caption + slides (titre/sous-titre) + hashtags.
  const result = await callClaudeText({
    prompt: buildPrompt(brief, framework, task),
    maxTokens: 1500,
    label: 'sparkexecute-carousel',
  })

  const { caption, slides, hashtags } = parseResponse(result.text)
  if (slides.length === 0) {
    throw new Error(
      "Le carrousel n'a pas pu être structuré (aucune slide). Réessaie.",
    )
  }

  // 2) Génère TOUTES les slides en PARALLÈLE (tient dans le budget de 120 s).
  //    Si une slide échoue, on la laisse sans image plutôt que de tout perdre.
  const size = ratioToGptSize('1:1')
  const withImages = await Promise.all(
    slides.map(async (slide) => {
      try {
        const url = await generateTextImageToBucket(
          buildSlideImagePrompt(slide, slides.length),
          size,
          'medium',
        )
        return { ...slide, image_url: url }
      } catch {
        return slide // sans image — signalé via image_error global
      }
    }),
  )

  const okCount = withImages.filter((s) => s.image_url).length
  const cover = withImages.find((s) => s.image_url)?.image_url

  return {
    output: {
      content: caption,
      image_url: cover,
      hashtags,
      image_error:
        okCount < slides.length
          ? `${slides.length - okCount} slide(s) sur ${slides.length} n'ont pas pu être illustrées — tu peux régénérer.`
          : undefined,
      metadata: {
        framework_used: framework,
        slides: withImages,
        slide_count: slides.length,
        slides_with_image: okCount,
      },
    },
    cost: {
      usd: result.costUsd + okCount * GPT_IMAGE_USD_PER_IMAGE,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
    frameworkUsed: framework,
  }
}

// ============================================================
// Prompt Claude (structure)
// ============================================================

function buildPrompt(
  brief: RunInputBrief,
  framework: string,
  task?: SparkpilotTask | null,
): string {
  const audience = brief.audience?.trim() || 'patrons de TPE/PME en Guadeloupe'
  const taskContext = task
    ? `\n[CONTEXTE TÂCHE] ${task.title}${task.description ? ' — ' + task.description : ''}\n`
    : ''

  return `[RÔLE]
Tu conçois un CARROUSEL de ${NB_SLIDES} slides pour les réseaux (Instagram /
LinkedIn) AU NOM DE DCG AI, pour des ${audience}.

[R0 — NE PAS DÉROGER]
- ZÉRO INVENTION : pas de faux chiffre, pas de fausse stat, pas de faux
  témoignage. Reste qualitatif si tu n'as pas de chiffre fiable.
- Jamais les noms internes "SparkExecute/SparkScan/SparkPilot/SparkHub".
- Ancrage Guadeloupe, ton accessible, tutoiement, zéro jargon.
- Le TEXTE DES SLIDES doit être TRÈS COURT (il sera affiché DANS l'image) :
  titre = 6 mots max ; sous-titre = 12 mots max. Phrases simples, sans accent
  superflu mais avec les accents corrects là où il en faut.

[STRUCTURE NARRATIVE — ${framework}]
- Slide 1 = HOOK : une accroche forte qui donne envie de swiper.
- Slides du milieu = une idée concrète par slide (un bénéfice, une astuce).
- Dernière slide = CTA : invite à réserver un audit gratuit (sans URL dans le
  texte de la slide — le lien ira dans la légende).

[SUJET] ${brief.sujet}
${taskContext}
[FORMAT DE RÉPONSE — BALISES EXACTES, RIEN D'AUTRE]
---CAPTION---
(la légende du post : 2 à 4 phrases, accroche + valeur + appel à l'action)
---END_CAPTION---
---SLIDES---
(EXACTEMENT ${NB_SLIDES} lignes, une par slide, au format "TITRE :: SOUS-TITRE")
---END_SLIDES---
---HASHTAGS---
(5 à 10 hashtags séparés par des espaces, sans le #)
---END_HASHTAGS---`
}

// ============================================================
// Prompt image d'une slide (gpt-image-1)
// ============================================================

function buildSlideImagePrompt(slide: Slide, total: number): string {
  return `Instagram carousel slide ${slide.index} of ${total}, square 1:1 format.
Design: minimalist editorial social-media poster. Warm beige/cream background
blending into deep emerald green on one side, subtle tropical palm-leaf
silhouettes, Guadeloupe Caribbean mood. No people, no logo, no watermark, no UI.

Render the following FRENCH text EXACTLY as written, perfectly spelled WITH
CORRECT FRENCH ACCENTS (é è ê à â î ô û ç). Large bold dark-emerald serif
headline, centered, highly readable:
"${slide.headline}"

Smaller subtitle below, same dark emerald, regular weight:
"${slide.subtext}"

Generous spacing, clean professional typography, high contrast for readability.`
}

// ============================================================
// Parsing
// ============================================================

function parseResponse(text: string): {
  caption: string
  slides: Slide[]
  hashtags: string[]
} {
  const cap = text.match(/---CAPTION---\s*([\s\S]*?)\s*---END_CAPTION---/i)
  const sld = text.match(/---SLIDES---\s*([\s\S]*?)\s*---END_SLIDES---/i)
  const tag = text.match(/---HASHTAGS---\s*([\s\S]*?)\s*---END_HASHTAGS---/i)

  const caption = cap ? cap[1].trim() : text.trim()

  const slides: Slide[] = []
  if (sld) {
    const lines = sld[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l.includes('::'))
    lines.forEach((line, i) => {
      const [headline, ...rest] = line.split('::')
      slides.push({
        index: i + 1,
        headline: headline.replace(/^\d+[).\s-]*/, '').trim(),
        subtext: rest.join('::').trim(),
      })
    })
  }

  const hashtags = tag
    ? tag[1]
        .split(/\s+|,/)
        .map((w) => w.replace(/^#+/, '').trim())
        .filter((w) => w.length > 0)
        .slice(0, 10)
    : []

  return { caption, slides, hashtags }
}
