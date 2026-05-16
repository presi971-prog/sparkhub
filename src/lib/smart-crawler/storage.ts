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

/**
 * Vérifie qu'une URL d'image est safe à fetcher côté serveur (protection SSRF).
 *
 * Bloque :
 * - URL non parseable ou protocole non http(s)
 * - hostname `localhost`, `*.local`, `*.internal`
 * - IPs privées IPv4 : 127.x.x.x (loopback), 10.x.x.x, 192.168.x.x, 172.16-31.x.x
 * - IPs spéciales IPv4 : 169.254.x.x (AWS/GCP metadata), 0.x.x.x
 * - IPs privées IPv6 : ::1 (loopback), fc00::/fd00:: (ULA), fe80:: (link-local)
 *
 * RAISON : sans ce filtre, un attaquant qui injecte une URL malveillante dans
 * le payload du webhook (avant le secret X-Webhook-Secret, ou si secret leak)
 * peut forcer notre serveur à fetch et stocker des données internes (metadata
 * cloud, services Vercel internes, etc.) sur notre Supabase Storage public.
 */
function isSafeImageUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    console.warn(`[smart-crawler/storage] SSRF check: URL non parseable (${url.slice(0, 80)})`)
    return false
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    console.warn(`[smart-crawler/storage] SSRF check: protocole non autorisé "${parsed.protocol}" (${url.slice(0, 80)})`)
    return false
  }

  const hostname = parsed.hostname.toLowerCase()

  // Hostnames suspects
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    console.warn(`[smart-crawler/storage] SSRF check: hostname interne bloqué "${hostname}"`)
    return false
  }

  // IPs IPv4 privées / spéciales
  const privateIPv4Regexes = [
    /^127\./,                          // loopback 127.0.0.0/8
    /^10\./,                           // 10.0.0.0/8
    /^192\.168\./,                     // 192.168.0.0/16
    /^172\.(1[6-9]|2[0-9]|3[01])\./,   // 172.16.0.0/12
    /^169\.254\./,                     // link-local 169.254.0.0/16 (AWS/GCP metadata)
    /^0\./,                            // 0.0.0.0/8
  ]
  for (const regex of privateIPv4Regexes) {
    if (regex.test(hostname)) {
      console.warn(`[smart-crawler/storage] SSRF check: IPv4 privée bloquée "${hostname}"`)
      return false
    }
  }

  // IPs IPv6 privées
  if (
    hostname === '::1' ||
    hostname === '[::1]' ||
    /^\[?fc[0-9a-f]{2}:/i.test(hostname) ||  // ULA fc00::/fd00::
    /^\[?fd[0-9a-f]{2}:/i.test(hostname) ||
    /^\[?fe80:/i.test(hostname)              // link-local
  ) {
    console.warn(`[smart-crawler/storage] SSRF check: IPv6 privée bloquée "${hostname}"`)
    return false
  }

  return true
}

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

  // Protection SSRF : refuser les URLs internes / IPs privées avant tout fetch
  if (!isSafeImageUrl(sourceUrl)) {
    return null
  }

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
