/**
 * Re-scan automatique hebdomadaire — le moteur de la boucle de suivi.
 *
 * Appelé par un cron Vercel quotidien. À chaque passage :
 *   1. Pour chaque utilisateur, repère son "site suivi" = le site de son
 *      scan terminé le plus récent.
 *   2. Si ce scan date de 7 jours ou plus (et qu'aucun scan ne tourne déjà),
 *      le site devient candidat au re-scan.
 *   3. UN SEUL candidat est re-scanné par passage (le plus ancien), en mode
 *      bloquant, pour rester dans la fenêtre d'exécution de l'hébergeur.
 *      Le cron quotidien étale naturellement les utilisateurs sur la semaine.
 *   4. Si le scan aboutit, un email récap (delta score IA / rang / mots-clés
 *      vs scan précédent) part via Resend, avec lien vers la page Suivi.
 *
 * Auth : même modèle que content-machine/generate-daily (Vercel cron Bearer
 * CRON_SECRET, ou header x-cron-secret pour un appel manuel).
 */

import { NextResponse } from 'next/server'

import { getSparkScanAdminClient } from '@/lib/sparkscan/supabase-admin'
import { analyzeUrl, type NiveauZone } from '@/lib/sparkscan/competitors'
import { extractDomain } from '@/lib/sparkscan/dataforseo'
import { sendVisibilityRecapEmail } from '@/lib/notifications'

export const dynamic = 'force-dynamic'
// Un scan complet peut dépasser 5 minutes (constaté : coupure à 300s sur le
// scan concours-spp du 03/07). 800s = plafond Fluid compute Vercel.
export const maxDuration = 800

const CRON_SECRET = process.env.CRON_SECRET
const RESCAN_AFTER_DAYS = 7

function verifyCronAuth(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${CRON_SECRET}`) return true
  const cronHeader = req.headers.get('x-cron-secret')
  if (cronHeader === CRON_SECRET) return true
  return false
}

interface GeoVisibilityEntry {
  domain: string
  visibility_score: number
  rank: number
}

interface ScanRow {
  id: string
  user_id: string
  input_url: string
  zone: string
  niveau_zone: string
  langue: string
  client_context: unknown
  created_at: string
  ranked_keywords_count: number | null
  geo_citations: { visibility?: GeoVisibilityEntry[] } | null
}

/** Score + rang IA du site cible dans un scan (même logique que la page Suivi). */
function targetGeo(scan: {
  input_url: string
  geo_citations: { visibility?: GeoVisibilityEntry[] } | null
}): GeoVisibilityEntry | null {
  const visibility = scan.geo_citations?.visibility
  if (!Array.isArray(visibility)) return null
  const host = extractDomain(scan.input_url)
  return (
    visibility.find(
      (v) => v.domain === host || host.endsWith(v.domain) || v.domain.endsWith(host),
    ) ?? null
  )
}

export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSparkScanAdminClient()

  // Scans terminés récents (le plus récent par user = son site suivi)
  const { data: completedRows, error } = await admin
    .from('sparkscan_scans')
    .select(
      'id, user_id, input_url, zone, niveau_zone, langue, client_context, created_at, ranked_keywords_count, geo_citations',
    )
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Users avec un scan déjà en cours (on ne double pas)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: runningRows } = await admin
    .from('sparkscan_scans')
    .select('user_id')
    .in('status', ['pending', 'running'])
    .gte('created_at', twoHoursAgo)
  const busyUsers = new Set((runningRows ?? []).map((r) => r.user_id as string))

  // Site suivi par user = scan terminé le plus récent (rows déjà triées desc)
  const latestByUser = new Map<string, ScanRow>()
  for (const row of (completedRows ?? []) as ScanRow[]) {
    if (!latestByUser.has(row.user_id)) latestByUser.set(row.user_id, row)
  }

  const staleLimit = Date.now() - RESCAN_AFTER_DAYS * 86_400_000
  const candidates = [...latestByUser.values()]
    .filter((s) => !busyUsers.has(s.user_id))
    .filter((s) => new Date(s.created_at).getTime() <= staleLimit)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const candidate = candidates[0]
  if (!candidate) {
    return NextResponse.json({
      rescanned: null,
      eligible: 0,
      message: `Aucun site à re-scanner (seuil : ${RESCAN_AFTER_DAYS} jours).`,
    })
  }

  const host = extractDomain(candidate.input_url)
  console.log(
    `[SparkScan][CRON] RESCAN ${host} (user=${candidate.user_id}, last=${candidate.created_at}, eligible=${candidates.length})`,
  )

  // Mode test : ?dry=1 montre ce que le cron FERAIT, sans scan ni email.
  if (new URL(req.url).searchParams.get('dry') === '1') {
    return NextResponse.json({
      dry_run: true,
      would_rescan: host,
      last_scan_at: candidate.created_at,
      eligible: candidates.map((c) => ({
        host: extractDomain(c.input_url),
        last_scan_at: c.created_at,
      })),
    })
  }

  // Re-scan BLOQUANT avec les mêmes paramètres que le scan d'origine
  const output = await analyzeUrl({
    userId: candidate.user_id,
    url: candidate.input_url,
    zone: candidate.zone,
    niveauZone: candidate.niveau_zone as NiveauZone,
    langue: candidate.langue,
    clientContext:
      (candidate.client_context as Parameters<typeof analyzeUrl>[0]['clientContext']) ??
      undefined,
    supabaseAdmin: admin,
  })

  if (output.status !== 'completed') {
    console.error(`[SparkScan][CRON] RESCAN FAILED ${host}: ${output.error_message}`)
    return NextResponse.json({
      rescanned: host,
      scan_id: output.scan_id,
      status: output.status,
      email_sent: false,
      error: output.error_message ?? null,
    })
  }

  // Email récap : nouveau scan vs scan précédent (le candidat)
  let emailSent = false
  try {
    const { data: userData } = await admin.auth.admin.getUserById(candidate.user_id)
    const email = userData?.user?.email
    if (email) {
      const newGeo = targetGeo({
        input_url: candidate.input_url,
        geo_citations: output.geo_citations as ScanRow['geo_citations'],
      })
      const prevGeo = targetGeo(candidate)
      const totalActors =
        (output.geo_citations as ScanRow['geo_citations'])?.visibility?.length ?? 0

      const metrics = []
      if (newGeo) {
        const delta = prevGeo ? newGeo.visibility_score - prevGeo.visibility_score : null
        metrics.push({
          label: 'Score de visibilité IA',
          current: `${newGeo.visibility_score}/100`,
          delta:
            delta === null
              ? null
              : delta === 0
                ? 'stable'
                : `${delta > 0 ? '+' : ''}${delta} pts`,
          direction: (delta === null || delta === 0
            ? 'flat'
            : delta > 0
              ? 'up'
              : 'down') as 'up' | 'down' | 'flat',
        })
        const rankDelta = prevGeo ? prevGeo.rank - newGeo.rank : null
        metrics.push({
          label: 'Rang IA vs concurrents',
          current: `${newGeo.rank}e sur ${totalActors}`,
          delta:
            rankDelta === null
              ? null
              : rankDelta === 0
                ? 'stable'
                : rankDelta > 0
                  ? `+${rankDelta} place${rankDelta > 1 ? 's' : ''}`
                  : `${rankDelta} place${rankDelta < -1 ? 's' : ''}`,
          direction: (rankDelta === null || rankDelta === 0
            ? 'flat'
            : rankDelta > 0
              ? 'up'
              : 'down') as 'up' | 'down' | 'flat',
        })
      }
      const kwDelta =
        candidate.ranked_keywords_count === null
          ? null
          : output.ranked_keywords_count - candidate.ranked_keywords_count
      metrics.push({
        label: 'Mots-clés top 20 Google',
        current: `${output.ranked_keywords_count}`,
        delta:
          kwDelta === null ? null : kwDelta === 0 ? 'stable' : `${kwDelta > 0 ? '+' : ''}${kwDelta}`,
        direction: (kwDelta === null || kwDelta === 0
          ? 'flat'
          : kwDelta > 0
            ? 'up'
            : 'down') as 'up' | 'down' | 'flat',
      })

      await sendVisibilityRecapEmail(email, host, metrics)
      emailSent = true
      console.log(`[SparkScan][CRON] RECAP EMAIL sent to ${email} for ${host}`)
    }
  } catch (emailErr) {
    const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
    console.error(`[SparkScan][CRON] RECAP EMAIL failed (non bloquant): ${msg}`)
  }

  return NextResponse.json({
    rescanned: host,
    scan_id: output.scan_id,
    status: output.status,
    cost_usd: output.cost_usd,
    email_sent: emailSent,
    eligible_remaining: candidates.length - 1,
  })
}
