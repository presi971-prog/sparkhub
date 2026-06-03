/**
 * GET /api/sparkscan/status?scan_id=...
 *
 * Polled toutes les 2s par l'UI tant que status === 'running'.
 * Retourne l'état complet d'un scan, scoped au user via RLS.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const scanId = searchParams.get('scan_id')
  if (!scanId) {
    return NextResponse.json({ error: 'Param requis : scan_id' }, { status: 400 })
  }

  // RLS filtre déjà sur user_id, mais on garde le filter explicite (defense in depth).
  const { data, error } = await supabase
    .from('sparkscan_scans')
    .select(
      'id, status, maturity_status, ranked_keywords_count, competitors_found, competitors_enriched, synthesis, geo_citations, site_analysis, client_context, method_used, cost_usd, error_message, created_at, completed_at, input_url, zone, niveau_zone, langue, progress',
    )
    .eq('id', scanId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Scan introuvable' }, { status: 404 })
  }

  return NextResponse.json(data)
}
