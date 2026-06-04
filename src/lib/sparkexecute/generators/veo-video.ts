/**
 * SparkExecute — génération vidéo (Reel) via Veo (kie.ai) + ré-hébergement.
 *
 * ⚠️ Endpoint de suivi = /veo/record-info (PAS /jobs/recordInfo, que le code
 * content-machine utilisait à tort pour la vidéo). Testé : veo3_fast 720p 8s en
 * ~19 s, format 9:16. L'URL Veo est TEMPORAIRE → on la ré-héberge dans le bucket.
 */

import { createSparkExecuteAdmin } from '../supabase-admin'

const VEO_GENERATE = 'https://api.kie.ai/api/v1/veo/generate'
const VEO_RECORD = 'https://api.kie.ai/api/v1/veo/record-info'
const BUCKET_NAME = 'sparkexecute-visuals'

/** Coût indicatif d'une vidéo veo3_fast 8s 720p (à confirmer sur kie.ai). */
export const VEO_USD_PER_VIDEO = 0.4

/**
 * Génère une vidéo verticale (9:16) via Veo, attend le rendu, puis la ré-héberge
 * dans le bucket et retourne l'URL publique stable (.mp4).
 *
 * @throws si KIE_API_KEY absente, crédits insuffisants, échec ou timeout.
 */
export async function generateVeoVideoToBucket(
  prompt: string,
  aspectRatio: '9:16' | '16:9' = '9:16',
): Promise<string> {
  const key = process.env.KIE_API_KEY
  if (!key) throw new Error('Configuration Veo manquante (KIE_API_KEY)')

  // 1) Création de la tâche.
  const createRes = await fetch(VEO_GENERATE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: 'veo3_fast',
      aspect_ratio: aspectRatio,
      enableTranslation: false,
      generationType: 'TEXT_2_VIDEO',
    }),
  })
  const createJson = (await createRes.json()) as {
    code?: number
    msg?: string
    data?: { taskId?: string }
  }
  if (createRes.status === 402 || createJson.code === 402) {
    throw new Error('Crédits Veo insuffisants — recharge ton compte kie.ai.')
  }
  const taskId = createJson.data?.taskId
  if (!taskId) {
    throw new Error(`Veo n'a pas démarré : ${createJson.msg ?? 'erreur inconnue'}`)
  }

  // 2) Polling /veo/record-info (cap ~110 s, sous le maxDuration 120 s de la route).
  const start = Date.now()
  while (Date.now() - start < 110_000) {
    await sleep(5000)
    const recRes = await fetch(`${VEO_RECORD}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    const rec = (await recRes.json()) as {
      data?: {
        successFlag?: number
        errorMessage?: string | null
        errorCode?: number | null
        response?: unknown
      }
    }
    const d = rec.data
    if (!d) continue
    if (d.errorMessage || d.errorCode) {
      throw new Error(`Veo a échoué : ${d.errorMessage ?? 'code ' + d.errorCode}`)
    }
    if (d.successFlag === 1) {
      const url = extractVideoUrl(d.response)
      if (!url) throw new Error('Veo terminé mais aucune URL vidéo renvoyée.')
      return rehostMp4(url)
    }
  }
  throw new Error('La génération vidéo a dépassé le temps imparti. Réessaie.')
}

function extractVideoUrl(response: unknown): string | null {
  let obj: unknown = response
  if (typeof response === 'string') {
    try {
      obj = JSON.parse(response)
    } catch {
      return response.startsWith('http') ? response : null
    }
  }
  if (obj && typeof obj === 'object') {
    const o = obj as Record<string, unknown>
    const urls = (o.resultUrls ?? o.result_urls ?? o.videos) as unknown
    if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string') {
      return urls[0]
    }
    if (typeof o.url === 'string') return o.url
  }
  return null
}

/** Télécharge la vidéo (URL temporaire Veo) et l'upload en .mp4 dans le bucket. */
async function rehostMp4(sourceUrl: string): Promise<string> {
  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(`Téléchargement vidéo impossible : HTTP ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())

  const supabase = createSparkExecuteAdmin()
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const fileName = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}.mp4`
  const storagePath = `${yearMonth}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, { contentType: 'video/mp4', upsert: false })
  if (uploadError) {
    throw new Error(`Upload vidéo échoué : ${uploadError.message}`)
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath)
  return data.publicUrl
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
