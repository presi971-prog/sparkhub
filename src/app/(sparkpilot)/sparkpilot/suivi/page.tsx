/**
 * Suivi — l'évolution de ta visibilité, scan après scan.
 *
 * Page fine : auth + lecture des scans terminés de l'utilisateur, puis
 * délègue tout l'affichage à <SuiviContent /> (composant pur, testable).
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import {
  groupScansBySite,
  SuiviContent,
  type KeywordRow,
  type SuiviScanRow,
} from '@/components/sparkpilot/suivi/suivi-content'

export const metadata = {
  title: 'Suivi',
}

export const dynamic = 'force-dynamic'

export default async function SparkPilotSuiviPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/connexion?redirectTo=/sparkpilot/suivi')
  }

  const { site } = await searchParams

  const { data: scanRows } = await supabase
    .from('sparkscan_scans')
    .select(
      'id, input_url, zone, status, created_at, completed_at, ranked_keywords_count, geo_citations',
    )
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: true })
    .limit(200)

  const scans = (scanRows ?? []) as SuiviScanRow[]

  // Positions de mots-clés des 2 derniers scans du site sélectionné
  // (le RLS de sparkscan_keywords limite déjà aux lignes de l'utilisateur).
  const { siteScans } = groupScansBySite(scans, site)
  const lastTwoIds = siteScans.slice(-2).map((s) => s.id)
  let keywordRows: KeywordRow[] = []
  if (lastTwoIds.length > 0) {
    const { data: kwRows } = await supabase
      .from('sparkscan_keywords')
      .select('scan_id, keyword, position, search_volume, ranked_url')
      .in('scan_id', lastTwoIds)
      .order('position', { ascending: true })
      .limit(400)
    keywordRows = (kwRows ?? []) as KeywordRow[]
  }

  return (
    <div className="relative mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-14">
      <nav
        aria-label="Fil d'Ariane"
        className="mb-6 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#5E626C]"
      >
        <Link href="/sparkpilot" className="transition hover:text-[#0F1115]">
          Tableau de bord
        </Link>
        <span className="text-[#A8ACB5]">/</span>
        <span className="text-[#0F1115]">Suivi</span>
      </nav>
      <SuiviContent scans={scans} selectedSite={site} keywordRows={keywordRows} />
    </div>
  )
}
