/**
 * SparkExecute — générateur de VIDÉO (Reel vertical 9:16, ~8 s).
 *
 * Claude écrit (1) un prompt cinématique en anglais pour Veo (décor/scène, SANS
 * texte incrusté) et (2) la légende + hashtags du post. Veo fabrique le clip
 * (~20 s), on le ré-héberge, et on renvoie l'URL vidéo.
 */

import { callClaudeText } from '../claude-text'
import { generateVeoVideoToBucket, VEO_USD_PER_VIDEO } from './veo-video'
import { PUBLISH_BRAND_NAME } from '../brand'
import type { RunInputBrief, RunOutput } from '../types'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

const DEFAULT_FRAMEWORK = 'Hook-Story-CTA'

export async function generateVideo(
  brief: RunInputBrief,
  task?: SparkpilotTask | null,
): Promise<{
  output: RunOutput
  cost: { usd: number; inputTokens: number; outputTokens: number }
  frameworkUsed: string
}> {
  const framework =
    brief.framework_override ?? task?.metadata?.framework_used ?? DEFAULT_FRAMEWORK

  // 1) Claude : prompt vidéo (anglais) + légende (français) + hashtags.
  const result = await callClaudeText({
    prompt: buildPrompt(brief, task),
    maxTokens: 1200,
    label: 'sparkexecute-video',
  })
  const { videoPrompt, caption, hashtags } = parseResponse(result.text)
  if (!videoPrompt) {
    throw new Error("Le scénario vidéo n'a pas pu être généré. Réessaie.")
  }

  // 2) Veo fabrique le clip vertical et on le ré-héberge.
  const videoUrl = await generateVeoVideoToBucket(videoPrompt, '9:16')

  return {
    output: {
      content: caption,
      video_url: videoUrl,
      hashtags,
      metadata: {
        framework_used: framework,
        video_prompt: videoPrompt,
        aspect_ratio: '9:16',
      },
    },
    cost: {
      usd: result.costUsd + VEO_USD_PER_VIDEO,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
    frameworkUsed: framework,
  }
}

function buildPrompt(brief: RunInputBrief, task?: SparkpilotTask | null): string {
  const audience = brief.audience?.trim() || 'patrons de TPE/PME en Guadeloupe'
  const taskContext = task
    ? `\n[CONTEXTE TÂCHE] ${task.title}${task.description ? ' — ' + task.description : ''}\n`
    : ''

  return `[RÔLE]
Tu conçois une courte VIDÉO verticale (Reel ~8 s) pour les réseaux, AU NOM DE
${PUBLISH_BRAND_NAME}, pour des ${audience}.

[R0]
- Le prompt vidéo est en ANGLAIS, cinématographique, SANS aucun texte incrusté,
  sans logo, sans watermark.
- Ancrage Guadeloupe (végétation tropicale, architecture créole colorée, lumière
  dorée). JAMAIS pull/col roulé, JAMAIS rue grise européenne.
- La scène = UNE action simple, concrète, lisible en 8 secondes (ex : un
  restaurateur souriant qui souffle, un artisan serein qui regarde son téléphone).
- La légende (français) : accroche + valeur + appel à l'action. Tutoiement, zéro
  jargon, zéro chiffre inventé, jamais les noms internes "SparkExecute" etc.

[SUJET] ${brief.sujet}
${taskContext}
[FORMAT — BALISES EXACTES, RIEN D'AUTRE]
---VIDEO_PROMPT---
(le prompt anglais cinématique pour la vidéo, 3 à 6 lignes, "Cinematic 8 second
clip, ... Subject: ... Setting: ... Light: ...". Aucun texte à l'écran.)
---END_VIDEO_PROMPT---
---CAPTION---
(la légende du post en français, 2 à 4 phrases)
---END_CAPTION---
---HASHTAGS---
(4 à 8 hashtags séparés par des espaces, sans le #)
---END_HASHTAGS---`
}

function parseResponse(text: string): {
  videoPrompt: string | null
  caption: string
  hashtags: string[]
} {
  const vp = text.match(/---VIDEO_PROMPT---\s*([\s\S]*?)\s*---END_VIDEO_PROMPT---/i)
  const cap = text.match(/---CAPTION---\s*([\s\S]*?)\s*---END_CAPTION---/i)
  const tag = text.match(/---HASHTAGS---\s*([\s\S]*?)\s*---END_HASHTAGS---/i)

  const videoPrompt = vp ? vp[1].trim() || null : null
  const caption = cap ? cap[1].trim() : text.trim()
  const hashtags = tag
    ? tag[1]
        .split(/\s+|,/)
        .map((w) => w.replace(/^#+/, '').trim())
        .filter((w) => w.length > 0)
        .slice(0, 8)
    : []

  return { videoPrompt, caption, hashtags }
}
