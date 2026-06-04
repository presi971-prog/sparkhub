/**
 * SparkExecute — génération d'images AVEC TEXTE intégré via OpenAI gpt-image-1.
 *
 * Pourquoi un 2e moteur d'image (en plus de Nano Banana / kie.ai) :
 *   - Nano Banana est excellent pour des PHOTOS éditoriales, mais médiocre pour
 *     rendre du TEXTE net dans l'image.
 *   - gpt-image-1 (OpenAI) rend du texte propre et bien orthographié → c'est LE
 *     bon outil pour les slides de CARROUSEL (titre + sous-titre dans l'image).
 *   (cf. mémoire feedback-chatgpt-image2-carrousels)
 *
 * Le flux : OpenAI renvoie l'image en base64 → on l'upload dans le bucket
 * Storage `sparkexecute-visuals` (public) → on retourne l'URL publique stable.
 */

import { createSparkExecuteAdmin } from '../supabase-admin'

const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations'
const BUCKET_NAME = 'sparkexecute-visuals'

/** Coût indicatif d'une image gpt-image-1 qualité "medium" (~$0.04). */
export const GPT_IMAGE_USD_PER_IMAGE = 0.04

/** Formats supportés par gpt-image-1, mappés depuis nos ratios. */
export type GptImageSize = '1024x1024' | '1024x1536' | '1536x1024'

export function ratioToGptSize(ratio: '1:1' | '4:5' | '16:9'): GptImageSize {
  if (ratio === '4:5') return '1024x1536' // portrait (le plus proche de 4:5)
  if (ratio === '16:9') return '1536x1024' // paysage
  return '1024x1024' // carré
}

/**
 * Génère une image via gpt-image-1 et la ré-héberge dans le bucket Storage.
 * Retourne l'URL publique persistante.
 *
 * @throws si OPENAI_API_KEY manquante, si l'API échoue, ou si l'upload échoue.
 *         Le caller décide du fallback (image_error soft).
 */
export async function generateTextImageToBucket(
  prompt: string,
  size: GptImageSize = '1024x1024',
  quality: 'low' | 'medium' | 'high' = 'medium',
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Configuration OpenAI manquante (OPENAI_API_KEY)')
  }

  const response = await fetch(OPENAI_IMAGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size,
      quality,
      n: 1,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`OPENAI_IMAGE_ERROR: ${response.status} - ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>
  }
  const b64 = data.data?.[0]?.b64_json
  if (!b64) {
    throw new Error('OpenAI n’a renvoyé aucune image')
  }

  const buffer = Buffer.from(b64, 'base64')
  return uploadToBucket(buffer)
}

/** Upload un buffer PNG dans le bucket et retourne l'URL publique. */
async function uploadToBucket(buffer: Buffer): Promise<string> {
  const supabase = createSparkExecuteAdmin()

  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const fileName = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}.png`
  const storagePath = `${yearMonth}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    throw new Error(`Upload Storage échoué : ${uploadError.message}`)
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath)
  return data.publicUrl
}
