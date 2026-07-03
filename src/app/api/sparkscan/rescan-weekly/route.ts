/**
 * Re-scan automatique hebdomadaire — le moteur de la boucle de suivi.
 *
 * Contrainte hébergeur : une fonction est plafonnée à 300s alors qu'un scan
 * complet peut durer plus. On fait donc comme l'interface SparkScan :
 * DÉCLENCHER le scan en arrière-plan (202 immédiat) puis revenir plus tard.
 * L'orchestrateur (cron VPS) enchaîne :
 *
 *   1. GET /api/sparkscan/rescan-weekly
 *      → nettoie les scans zombis (running > 30 min, reco audit 07/06),
 *        choisit le site suivi le plus "périmé" (dernier scan >= 7 jours,
 *        un seul par passage), lance startScanInBackground,
 *        répond 202 { scan_id, previous_scan_id, host }.
 *   2. GET ...?report=<scan_id>&previous=<previous_scan_id>  (toutes les 60s)
 *      → si le scan est fini : envoie l'email récap (deltas vs scan précédent)
 *        et marque l'envoi (idempotent). Sinon { ready: false }.
 *
 *   Mode test : ?dry=1 montre le candidat sans rien lancer.
 *
 * Auth : Bearer CRON_SECRET ou header x-cron-secret (pattern content-machine).
 */

import { NextResponse } from 'next/server'

import { getSparkScanAdminClient } from '@/lib/sparkscan/supabase-admin'
import {
  startScanInBackground,
  type NiveauZone,
} from '@/lib/sparkscan/competitors'
import { extractDomain } from '@/lib/sparkscan/dataforseo'
import { decomposeReportToTasks } from '@/lib/sparkpilot/decompose'
import {
  sendVisibilityRecapEmail,
  sendWeeklyHumanTasksEmail,
} from '@/lib/notifications'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET
const RESCAN_AFTER_DAYS = 7
const STUCK_SCAN_MINUTES = 30

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
  status?: string
  error_message?: string | null
  progress?: Record<string, unknown> | null
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

/**
 * Janitor (reco n°1 audit 07/06) : un scan "running" depuis plus de 30 min est
 * mort (fonction coupée par l'hébergeur). On le passe en erreur, sinon il
 * bloque à jamais les relances (index anti-double-run) et fausse l'UI.
 */
async function cleanupStuckScans(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_SCAN_MINUTES * 60_000).toISOString()
  const { data } = await admin
    .from('sparkscan_scans')
    .update({
      status: 'error',
      error_message: `Scan interrompu (aucune activité depuis ${STUCK_SCAN_MINUTES} min : fonction probablement coupée par l'hébergeur). Relance-le.`,
    })
    .in('status', ['pending', 'running'])
    .lt('created_at', cutoff)
    .select('id')
  const cleaned = data?.length ?? 0
  if (cleaned > 0) {
    console.log(`[SparkScan][CRON] JANITOR: ${cleaned} scan(s) zombi(s) passés en erreur`)
  }
  return cleaned
}

export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSparkScanAdminClient()
  const params = new URL(req.url).searchParams

  const cleaned = await cleanupStuckScans(admin)

  // ---- Phase rapport : ?report=<scan_id>&previous=<scan_id> ----
  const reportId = params.get('report')
  if (reportId) {
    return handleReport(admin, reportId, params.get('previous'))
  }

  // ---- Lundi : email des tâches humaines de la semaine (étape 3.2) ----
  // Idempotent via metadata.weekly_email_last sur le plan (le cron VPS peut
  // appeler cette route plusieurs fois le même jour).
  const isoToday = new Date().getUTCDay() === 0 ? 7 : new Date().getUTCDay()
  if (isoToday === 1) {
    await sendMondayTaskEmails(admin).catch((e) =>
      console.error('[SparkScan][CRON] Email lundi échoué (non bloquant):', e),
    )
  }

  // ---- Phase déclenchement ----
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
  const { data: runningRows } = await admin
    .from('sparkscan_scans')
    .select('user_id')
    .in('status', ['pending', 'running'])
  const busyUsers = new Set((runningRows ?? []).map((r: { user_id: string }) => r.user_id))

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
      cleaned_stuck: cleaned,
      message: `Aucun site à re-scanner (seuil : ${RESCAN_AFTER_DAYS} jours).`,
    })
  }

  const host = extractDomain(candidate.input_url)

  if (params.get('dry') === '1') {
    return NextResponse.json({
      dry_run: true,
      would_rescan: host,
      last_scan_at: candidate.created_at,
      cleaned_stuck: cleaned,
      eligible: candidates.map((c) => ({
        host: extractDomain(c.input_url),
        last_scan_at: c.created_at,
      })),
    })
  }

  console.log(
    `[SparkScan][CRON] TRIGGER rescan ${host} (user=${candidate.user_id}, last=${candidate.created_at}, eligible=${candidates.length})`,
  )

  const { scanId, cachedOutput } = await startScanInBackground({
    userId: candidate.user_id,
    url: candidate.input_url,
    zone: candidate.zone,
    niveauZone: candidate.niveau_zone as NiveauZone,
    langue: candidate.langue,
    clientContext:
      (candidate.client_context as Parameters<
        typeof startScanInBackground
      >[0]['clientContext']) ?? undefined,
    supabaseAdmin: admin,
  })

  return NextResponse.json(
    {
      triggered: host,
      scan_id: cachedOutput ? cachedOutput.scan_id : scanId,
      previous_scan_id: candidate.id,
      cached: !!cachedOutput,
      cleaned_stuck: cleaned,
      next: `?report=${cachedOutput ? cachedOutput.scan_id : scanId}&previous=${candidate.id}`,
    },
    { status: 202 },
  )
}

/**
 * Lundi matin : pour chaque plan SparkPilot actif, envoie à son propriétaire
 * l'email des tâches humaines de la semaine (dues sous 7 jours ou en retard).
 * Idempotent par plan via metadata.weekly_email_last.
 */
async function sendMondayTaskEmails(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
) {
  const today = new Date().toISOString().split('T')[0]
  const { data: plans } = await admin
    .from('sparkpilot_plans')
    .select('id, user_id, title, metadata')
    .eq('status', 'active')
    .limit(10)

  for (const plan of plans ?? []) {
    if (plan.metadata?.weekly_email_last === today) continue

    const inSevenDays = new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0]
    const { data: taskRows } = await admin
      .from('sparkpilot_tasks')
      .select('title, due_date, status')
      .eq('plan_id', plan.id)
      .neq('status', 'done')
      .lte('due_date', inSevenDays)
      .order('due_date', { ascending: true })
      .limit(12)
    const tasks = ((taskRows ?? []) as { title: string; due_date: string | null }[]).map(
      (t) => ({
        title: t.title,
        due_date: t.due_date,
        overdue: !!t.due_date && t.due_date < today,
      }),
    )

    const { data: userData } = await admin.auth.admin.getUserById(plan.user_id)
    const email = userData?.user?.email
    if (!email) continue

    await sendWeeklyHumanTasksEmail(email, plan.title ?? 'Plan visibilité', tasks)
    await admin
      .from('sparkpilot_plans')
      .update({ metadata: { ...(plan.metadata ?? {}), weekly_email_last: today } })
      .eq('id', plan.id)
    console.log(`[SparkScan][CRON] EMAIL LUNDI envoyé à ${email} (${tasks.length} tâches)`)
  }
}

/**
 * Phase rapport : si le scan est terminé, envoie l'email récap (une seule
 * fois : marqueur recap_email_sent dans la colonne progress).
 */
async function handleReport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  scanId: string,
  previousId: string | null,
) {
  const { data: scan } = await admin
    .from('sparkscan_scans')
    .select(
      'id, user_id, input_url, status, error_message, progress, created_at, ranked_keywords_count, geo_citations',
    )
    .eq('id', scanId)
    .maybeSingle()

  if (!scan) {
    return NextResponse.json({ error: 'Scan introuvable' }, { status: 404 })
  }
  const row = scan as ScanRow
  if (row.status === 'pending' || row.status === 'running') {
    return NextResponse.json({ ready: false, status: row.status })
  }
  if (row.status === 'error') {
    return NextResponse.json({
      ready: true,
      status: 'error',
      email_sent: false,
      error: row.error_message ?? null,
    })
  }

  if (row.progress?.recap_email_sent) {
    return NextResponse.json({ ready: true, status: 'completed', email_sent: 'already' })
  }

  let previous: ScanRow | null = null
  if (previousId) {
    const { data: prevRow } = await admin
      .from('sparkscan_scans')
      .select('id, user_id, input_url, created_at, ranked_keywords_count, geo_citations')
      .eq('id', previousId)
      .maybeSingle()
    previous = (prevRow as ScanRow) ?? null
  }

  const host = extractDomain(row.input_url)
  const { data: userData } = await admin.auth.admin.getUserById(row.user_id)
  const email = userData?.user?.email
  if (!email) {
    return NextResponse.json({ ready: true, status: 'completed', email_sent: false })
  }

  const newGeo = targetGeo(row)
  const prevGeo = previous ? targetGeo(previous) : null
  const totalActors = row.geo_citations?.visibility?.length ?? 0

  const metrics: {
    label: string
    current: string
    delta: string | null
    direction: 'up' | 'down' | 'flat'
  }[] = []
  const dir = (d: number | null): 'up' | 'down' | 'flat' =>
    d === null || d === 0 ? 'flat' : d > 0 ? 'up' : 'down'

  if (newGeo) {
    const delta = prevGeo ? newGeo.visibility_score - prevGeo.visibility_score : null
    metrics.push({
      label: 'Score de visibilité IA',
      current: `${newGeo.visibility_score}/100`,
      delta:
        delta === null ? null : delta === 0 ? 'stable' : `${delta > 0 ? '+' : ''}${delta} pts`,
      direction: dir(delta),
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
            : `${rankDelta > 0 ? '+' : ''}${rankDelta} place${Math.abs(rankDelta) > 1 ? 's' : ''}`,
      direction: dir(rankDelta),
    })
  }
  const kwDelta =
    previous && previous.ranked_keywords_count !== null
      ? (row.ranked_keywords_count ?? 0) - previous.ranked_keywords_count
      : null
  metrics.push({
    label: 'Mots-clés top 20 Google',
    current: `${row.ranked_keywords_count ?? 0}`,
    delta:
      kwDelta === null ? null : kwDelta === 0 ? 'stable' : `${kwDelta > 0 ? '+' : ''}${kwDelta}`,
    direction: dir(kwDelta),
  })

  await sendVisibilityRecapEmail(email, host, metrics)
  await admin
    .from('sparkscan_scans')
    .update({
      progress: { ...(row.progress ?? {}), recap_email_sent: new Date().toISOString() },
    })
    .eq('id', row.id)

  console.log(`[SparkScan][CRON] RECAP EMAIL sent to ${email} for ${host}`)

  // Plan vivant (étape 3) : le nouveau scan régénère le plan SparkPilot.
  // On crée d'abord le nouveau plan, PUIS on archive les anciens (jamais
  // l'inverse : si la génération échoue, l'utilisateur garde son plan).
  // Non bloquant : certains scans n'ont pas de top3 (jeunes sites) → on log.
  let planRegenerated = false
  try {
    const result = await decomposeReportToTasks(row.id, admin, row.user_id)
    await admin
      .from('sparkpilot_plans')
      .update({ status: 'archived' })
      .eq('user_id', row.user_id)
      .eq('status', 'active')
      .neq('id', result.planId)
    planRegenerated = true
    console.log(
      `[SparkScan][CRON] PLAN régénéré ${result.planId} (${result.tasksInserted} tâches), anciens archivés`,
    )
  } catch (planErr) {
    const msg = planErr instanceof Error ? planErr.message : String(planErr)
    console.error(`[SparkScan][CRON] Régénération du plan impossible (non bloquant): ${msg}`)
  }

  return NextResponse.json({
    ready: true,
    status: 'completed',
    email_sent: true,
    plan_regenerated: planRegenerated,
  })
}
