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

  // Auto-réparation : un scan dure ~6-7 min. S'il est encore 'running' au-delà
  // de 15 min, c'est que le process de fond a été tué (Vercel coupe les
  // fonctions après la réponse). On le bascule en 'error' au lieu de le laisser
  // tourner dans le vide à l'infini (et de bloquer le quota coût du user).
  const STUCK_AFTER_MS = 15 * 60 * 1000
  if (
    data.status === 'running' &&
    Date.now() - new Date(data.created_at).getTime() > STUCK_AFTER_MS
  ) {
    const message =
      'Analyse interrompue (elle a dépassé le temps maximum). Relance-la.'
    await supabase
      .from('sparkscan_scans')
      .update({ status: 'error', error_message: message })
      .eq('id', scanId)
      .eq('user_id', user.id)
      .eq('status', 'running')
    return NextResponse.json({ ...data, status: 'error', error_message: message })
  }

  return NextResponse.json(data)
}
