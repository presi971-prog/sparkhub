/**
 * Endpoint de publication programmée des articles de blog (SparkExecute).
 *
 * - Le cron quotidien (/api/content-machine/generate-daily) appelle déjà la même
 *   logique : cet endpoint sert surtout à VÉRIFIER / déclencher à la main.
 * - Protégé par CRON_SECRET (header Authorization: Bearer <secret> ou
 *   x-cron-secret), comme le cron content-machine.
 *
 * Query params :
 *   ?dry=1                 → mode simulation : ne publie rien, renvoie ce qui SERAIT publié.
 *   ?date=YYYY-MM-DD       → force la date "du jour" (UTC) pour tester la logique.
 *
 * Exemple de vérification :
 *   GET /api/sparkexecute/publish-scheduled?dry=1&date=2026-06-09
 */

import { NextResponse } from 'next/server'
import { publishDueScheduledBlogPosts } from '@/lib/sparkexecute/publishers/scheduled-blog'
import { publishDueCarousels } from '@/lib/sparkexecute/publishers/scheduled-carousels'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET

function authorized(req: Request): boolean {
  if (!CRON_SECRET) return true // pas de secret configuré → ouvert (dev)
  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${CRON_SECRET}`) return true
  if (req.headers.get('x-cron-secret') === CRON_SECRET) return true
  return false
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dry') === '1' || url.searchParams.get('dry') === 'true'
  const referenceDate = url.searchParams.get('date') ?? undefined

  try {
    const summary = await publishDueScheduledBlogPosts({ referenceDate, dryRun })
    // Carrousels éducatifs : publication immédiate le jour J (isolée — une erreur
    // carrousel ne doit jamais bloquer la publication du blog).
    let carousels = null
    try {
      carousels = await publishDueCarousels({ referenceDate, dryRun })
    } catch (e) {
      carousels = { error: e instanceof Error ? e.message : 'Erreur carrousels' }
    }
    return NextResponse.json({ ...summary, carousels })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
