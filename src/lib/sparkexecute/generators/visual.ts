/**
 * SparkExecute — générateur de visuel (image 1080×1080 via Nano Banana / kie.ai).
 *
 * Pourquoi : un post sans visuel performe 5-10× moins. SparkExecute doit donc
 * pouvoir générer une image qui accompagne un post (LinkedIn, Instagram) ou
 * qui sert de bannière (article, mini-site).
 *
 * Stack :
 *   - Génération via Kie AI (Nano Banana Pro) — pipeline mutualisé dans
 *     `./image-pipeline.ts`.
 *   - Upload dans le bucket Storage `sparkexecute-visuals` (cf. migration 052),
 *     public en lecture pour pouvoir afficher l'image sans URL signée.
 *
 * Si l'env KIE_API_KEY n'est pas configurée → fallback gracieux (output.content
 * vide, metadata.error remplie). L'orchestrateur basculera le run en 'failed'.
 */

import {
  buildEditorialPhotoPrompt,
  generateAndStoreImage,
  NANO_BANANA_PRO_USD_PER_IMAGE,
} from './image-pipeline'
import type { RunInputBrief, RunOutput } from '../types'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

export async function generateVisual(
  brief: RunInputBrief,
  task?: SparkpilotTask | null,
): Promise<{ output: RunOutput; cost: { usd: number; inputTokens: number; outputTokens: number }; frameworkUsed: string }> {
  const framework = brief.framework_override ?? task?.metadata?.framework_used ?? 'Nano Banana'

  // Vérif config : si pas de clé Kie, on ne lance même pas la génération.
  if (!process.env.KIE_API_KEY) {
    return {
      output: {
        content: '',
        metadata: {
          error: 'Configuration Nano Banana manquante',
          framework_used: framework,
        },
      },
      cost: { usd: 0, inputTokens: 0, outputTokens: 0 },
      frameworkUsed: framework,
    }
  }

  // Format image : 1:1 par défaut (universel), 4:5 portrait sur demande explicite.
  const aspectRatio: '1:1' | '4:5' = brief.aspect_ratio === '4:5' ? '4:5' : '1:1'
  const dimensions = aspectRatio === '4:5'
    ? { width: 1080, height: 1350 }
    : { width: 1080, height: 1080 }

  const prompt = buildNanoBananaPrompt(brief, task, aspectRatio)

  try {
    const publicUrl = await generateAndStoreImage(prompt, aspectRatio)

    return {
      output: {
        content: '',
        image_url: publicUrl,
        alt_text: buildAltText(brief),
        metadata: {
          framework_used: framework,
          generated_width: dimensions.width,
          generated_height: dimensions.height,
          aspect_ratio: aspectRatio,
          source_provider: 'kie.ai (nano-banana-pro)',
          source_prompt: prompt,
        },
      },
      // On compte 0 token Claude (c'est une génération image) et un coût fixe.
      cost: {
        usd: NANO_BANANA_PRO_USD_PER_IMAGE,
        inputTokens: 0,
        outputTokens: 0,
      },
      frameworkUsed: framework,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // On renvoie une output "failed-soft" — l'orchestrateur basculera le statut
    // global du run sur 'failed' avec ce message.
    return {
      output: {
        content: '',
        metadata: {
          error: `Génération visuelle échouée : ${msg}`,
          framework_used: framework,
        },
      },
      cost: { usd: 0, inputTokens: 0, outputTokens: 0 },
      frameworkUsed: framework,
    }
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Construit le prompt Nano Banana en anglais (le modèle gère mieux l'anglais
 * pour la précision visuelle) avec un ancrage Guadeloupe explicite (R0 ancrage).
 */
function buildNanoBananaPrompt(
  brief: RunInputBrief,
  task?: SparkpilotTask | null,
  aspectRatio: '1:1' | '4:5' = '1:1',
): string {
  const contextLine = task?.title
    ? `Context: this visual accompanies a SparkPilot task titled "${task.title}".`
    : ''

  return buildEditorialPhotoPrompt({
    subject: brief.sujet,
    audience: brief.audience || 'small business owner in Guadeloupe',
    tone: brief.ton || 'professional and warm',
    extra: contextLine,
    aspectRatioHint: aspectRatio === '4:5' ? 'portrait' : 'square',
  })
}

function buildAltText(brief: RunInputBrief): string {
  // Description sobre pour l'accessibilité (max 125 caractères conseillé).
  return `Visuel SparkExecute : ${brief.sujet}`.slice(0, 125)
}
