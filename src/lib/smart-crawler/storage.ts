// Smart Crawler — Storage helper
//
// CONTEXTE
// Les CDN Instagram (scontent.cdninstagram.com) signent leurs URLs avec une
// expiration courte (quelques minutes/heures), même si le param `oe=`
// indique une date plus lointaine. Quand on stocke ces URLs dans Supabase
// pour servir le mini-site, elles renvoient HTTP 403 dès que le prospect
// ouvre le lien quelques heures plus tard.
//
// Solution : télécharger l'image côté serveur dès qu'on la reçoit d'Apify,
// l'uploader dans Supabase Storage (bucket public `demo-site-assets`),
// et retourner l'URL publique permanente.
//
// REQUIS :
// - Bucket Supabase `demo-site-assets` créé en public (migration 037)
// - SUPABASE_SERVICE_ROLE_KEY en env var (déjà présent côté Vercel)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wytvwfgamfaoqmvoqzps.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const BUCKET = 'demo-site-assets'

function getSupabase() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('[smart-crawler/storage] SUPABASE_SERVICE_ROLE_KEY missing')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

/**
 * Télécharge une image depuis une URL externe (typiquement Instagram CDN avec
 * URL signée temporaire) et l'upload dans Supabase Storage. Retourne l'URL
 * publique permanente.
 *
 * Si le téléchargement ou l'upload échoue, retourne null (le caller devra
 * fallback sur l'URL d'origine ou laisser vide).
 *
 * @param sourceUrl URL externe à télécharger
 * @param contactId ID GHL du contact (utilisé comme préfixe du chemin storage)
 * @param label Identifiant court de l'image (ex: 'logo', 'hero', 'post-1')
 */
export async function persistImage(
  sourceUrl: string,
  contactId: string,
  label: string
): Promise<string | null> {
  if (!sourceUrl || !contactId) return null

  try {
    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      console.warn(`[smart-crawler/storage] Téléchargement échoué (${response.status}) pour ${sourceUrl.slice(0, 80)}`)
      return null
    }

    const contentType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
    const extension = contentType.split('/')[1] || 'jpg'
    const buffer = await response.arrayBuffer()

    if (buffer.byteLength === 0) {
      console.warn('[smart-crawler/storage] Image téléchargée vide')
      return null
    }

    const path = `${contactId.toLowerCase()}/${label}.${extension}`
    const supabase = getSupabase()

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.warn('[smart-crawler/storage] Upload échoué:', uploadError.message)
      return null
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    console.log(`[smart-crawler/storage] Image uploadée: ${path} (${(buffer.byteLength / 1024).toFixed(1)} KB)`)
    return data.publicUrl
  } catch (error) {
    console.warn('[smart-crawler/storage] Erreur:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Persiste plusieurs images en parallèle. Les images qui échouent ont leur
 * entrée à null. Préserve l'ordre.
 */
export async function persistImages(
  items: Array<{ url: string; label: string }>,
  contactId: string
): Promise<Array<string | null>> {
  return Promise.all(items.map((item) => persistImage(item.url, contactId, item.label)))
}
