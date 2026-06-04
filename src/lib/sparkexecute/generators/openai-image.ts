/**
 * SparkExecute — images via OpenAI gpt-image-1 + hébergement bucket.
 *
 * Deux usages :
 *   1. generateTextImageToBucket : image complète (texte inclus si on l'accepte).
 *   2. generateImageBuffer + uploadPngToBucket : pour les CARROUSELS, on génère
 *      un DÉCOR SANS TEXTE (buffer), on écrit le texte par-dessus avec une vraie
 *      police (cf. slide-composer.ts) — accents français 100% corrects garantis,
 *      contrairement au texte dessiné par l'IA (qui glisse des fautes : "tàches").
 *
 * Le flux : OpenAI renvoie l'image en base64 → buffer PNG → (composition) →
 * upload bucket `sparkexecute-visuals` (public) → URL publique stable.
 */

import { createSparkExecuteAdmin } from '../supabase-admin'

const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations'
const BUCKET_NAME = 'sparkexecute-visuals'

/** Coût indicatif d'une image gpt-image-1 qualité "medium" (~$0.04). */
export const GPT_IMAGE_USD_PER_IMAGE = 0.04

/** Formats supportés par gpt-image-1, mappés depuis nos ratios. */
export type GptImageSize = '1024x1024' | '1024x1536' | '1536x1024'

export function ratioToGptSize(ratio: '1:1' | '4:5' | '16:9'): GptImageSize {
  if (ratio === '4:5') return '1024x1536'
  if (ratio === '16:9') return '1536x1024'
  return '1024x1024'
}

/** Génère une image gpt-image-1 et retourne le buffer PNG brut (sans upload). */
export async function generateImageBuffer(
  prompt: string,
  size: GptImageSize = '1024x1024',
  quality: 'low' | 'medium' | 'high' = 'medium',
): Promise<Buffer> {
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
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size, quality, n: 1 }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`OPENAI_IMAGE_ERROR: ${response.status} - ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as { data?: Array<{ b64_json?: string }> }
  const b64 = data.data?.[0]?.b64_json
  if (!b64) {
    throw new Error('OpenAI n’a renvoyé aucune image')
  }
  return Buffer.from(b64, 'base64')
}

/** Upload un buffer PNG dans le bucket et retourne l'URL publique. */
export async function uploadPngToBucket(buffer: Buffer): Promise<string> {
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

/** Génère une image (texte inclus) et l'héberge. Retourne l'URL publique. */
export async function generateTextImageToBucket(
  prompt: string,
  size: GptImageSize = '1024x1024',
  quality: 'low' | 'medium' | 'high' = 'medium',
): Promise<string> {
  const buffer = await generateImageBuffer(prompt, size, quality)
  return uploadPngToBucket(buffer)
}
