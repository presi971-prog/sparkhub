/**
 * Contenu de la page Suivi — composant d'affichage pur (Server Component).
 *
 * Reçoit les scans SparkScan terminés (déjà filtrés par utilisateur par
 * l'appelant), les regroupe par site scanné, et trace l'évolution :
 *   - score de visibilité IA (geo_citations, Perplexity)
 *   - nombre de mots-clés dans le top 20 Google (DataForSEO)
 *   - delta entre les 2 derniers scans (cartes KPI)
 *   - tableau détaillé de chaque scan (accès au rapport complet)
 *
 * Séparé de la page pour que l'auth/le fetch restent dans page.tsx.
 */

import {
  ArrowRight,
  CalendarClock,
  KeyRound,
  Medal,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

import { KpiCard } from '@/components/sparkpilot/kpi-card'
import {
  EvolutionChart,
  type EvolutionPoint,
} from '@/components/sparkpilot/suivi/evolution-chart'

interface GeoVisibilityEntry {
  domain: string
  label: string
  mentions: number
  questions_appeared_in: number
  visibility_score: number
  rank: number
}

export interface SuiviScanRow {
  id: string
  input_url: string
  zone: string
  status: string
  created_at: string
  completed_at: string | null
  ranked_keywords_count: number | null
  geo_citations: {
    questions_asked?: string[]
    visibility?: GeoVisibilityEntry[]
    insights?: string
  } | null
}

/** Une position de mot-clé enregistrée pour un scan (table sparkscan_keywords). */
export interface KeywordRow {
  scan_id: string
  keyword: string
  position: number
  search_volume: number | null
  ranked_url: string | null
}

/** Hôte propre d'une URL saisie ("https://www.foo.com/x" → "foo.com"). */
export function hostOf(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(
      /^www\./,
      '',
    )
  } catch {
    return url
  }
}

/** Entrée de visibilité IA du site cible dans un scan (pas les concurrents). */
function targetGeoEntry(scan: SuiviScanRow): GeoVisibilityEntry | null {
  const visibility = scan.geo_citations?.visibility
  if (!Array.isArray(visibility)) return null
  const host = hostOf(scan.input_url)
  return (
    visibility.find(
      (v) => v.domain === host || host.endsWith(v.domain) || v.domain.endsWith(host),
    ) ?? null
  )
}

/**
 * Regroupe les scans par site (hôte nettoyé) et détermine le site sélectionné.
 * Exporté pour que page.tsx sache quels scan_ids interroger pour les mots-clés.
 */
export function groupScansBySite(
  scans: SuiviScanRow[],
  selectedSite?: string,
): {
  sites: [string, SuiviScanRow[]][]
  selectedHost: string | null
  siteScans: SuiviScanRow[]
} {
  const bySite = new Map<string, SuiviScanRow[]>()
  for (const scan of scans) {
    const host = hostOf(scan.input_url)
    const list = bySite.get(host) ?? []
    list.push(scan)
    bySite.set(host, list)
  }
  // Du site le plus récemment scanné au moins récent.
  const sites = [...bySite.entries()].sort(
    (a, b) =>
      new Date(b[1][b[1].length - 1].created_at).getTime() -
      new Date(a[1][a[1].length - 1].created_at).getTime(),
  )
  if (sites.length === 0) {
    return { sites, selectedHost: null, siteScans: [] }
  }
  const selectedHost =
    selectedSite && bySite.has(selectedSite) ? selectedSite : sites[0][0]
  return { sites, selectedHost, siteScans: bySite.get(selectedHost)! }
}

export function SuiviContent({
  scans,
  selectedSite,
  keywordRows = [],
}: {
  /** Scans terminés, triés du plus ancien au plus récent. */
  scans: SuiviScanRow[]
  /** Hôte sélectionné via ?site= (optionnel). */
  selectedSite?: string
  /** Positions de mots-clés des 2 derniers scans du site sélectionné. */
  keywordRows?: KeywordRow[]
}) {
  const { sites, selectedHost, siteScans } = groupScansBySite(scans, selectedSite)

  if (sites.length === 0 || !selectedHost) {
    return <EmptySuivi />
  }

  // Séries temporelles (un scan peut ne pas avoir de mesure GEO : on saute le point).
  const scorePoints: EvolutionPoint[] = []
  const rankPoints: { date: string; rank: number; total: number }[] = []
  const keywordPoints: EvolutionPoint[] = []
  for (const scan of siteScans) {
    const geo = targetGeoEntry(scan)
    if (geo) {
      scorePoints.push({ date: scan.created_at, value: geo.visibility_score })
      rankPoints.push({
        date: scan.created_at,
        rank: geo.rank,
        total: scan.geo_citations?.visibility?.length ?? 0,
      })
    }
    if (scan.ranked_keywords_count !== null) {
      keywordPoints.push({ date: scan.created_at, value: scan.ranked_keywords_count })
    }
  }

  const lastScan = siteScans[siteScans.length - 1]
  const lastScore = scorePoints[scorePoints.length - 1]
  const prevScore = scorePoints[scorePoints.length - 2]
  const lastRank = rankPoints[rankPoints.length - 1]
  const prevRank = rankPoints[rankPoints.length - 2]
  const lastKeywords = keywordPoints[keywordPoints.length - 1]
  const prevKeywords = keywordPoints[keywordPoints.length - 2]

  const lastScanDate = new Date(lastScan.created_at)
  const daysSinceLastScan = Math.floor(
    (new Date().getTime() - lastScanDate.getTime()) / 86_400_000,
  )

  return (
    <>
      {/* En-tête */}
      <section className="mb-8">
        <h1
          className="text-[36px] leading-tight tracking-tight sm:text-[44px]"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          Ta visibilité, <span className="italic text-[#2E2A78]">scan après scan</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-[#5E626C]">
          Chaque scan SparkScan est une photo. Ici, on met les photos côte à côte
          pour voir si tes actions paient : score de visibilité IA, mots-clés sur
          Google, position face aux concurrents.
        </p>
      </section>

      {/* Sélecteur de site (si plusieurs sites scannés) */}
      {sites.length > 1 && (
        <nav aria-label="Choisir le site suivi" className="mb-8 flex flex-wrap gap-2">
          {sites.map(([host, list]) => (
            <Link
              key={host}
              href={`/sparkpilot/suivi?site=${encodeURIComponent(host)}`}
              className={`rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-wide transition ${
                host === selectedHost
                  ? 'border-[#4F46E5] bg-[#EEF0FF] text-[#4F46E5]'
                  : 'border-[#E9E5D9] bg-white text-[#5E626C] hover:border-[#A8ACB5]'
              }`}
            >
              {host}
              <span className="ml-1.5 text-[#A8ACB5]">{list.length}</span>
            </Link>
          ))}
        </nav>
      )}

      {/* Cartes KPI : dernier état + delta vs scan précédent */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Score visibilité IA"
          icon={Sparkles}
          accent="indigo"
          value={lastScore ? lastScore.value : '—'}
          valueSuffix={lastScore ? '/100' : undefined}
          hint={
            lastScore ? (
              <DeltaHint
                delta={prevScore ? lastScore.value - prevScore.value : null}
                unit="pt"
              />
            ) : (
              'Pas encore mesuré sur ce site.'
            )
          }
        />
        <KpiCard
          label="Rang IA vs concurrents"
          icon={Medal}
          accent="honey"
          value={lastRank ? `${lastRank.rank}ᵉ` : '—'}
          valueSuffix={lastRank ? `sur ${lastRank.total}` : undefined}
          hint={
            lastRank && prevRank ? (
              <DeltaHint delta={prevRank.rank - lastRank.rank} unit="place" />
            ) : (
              'Ta place dans les réponses des IA.'
            )
          }
        />
        <KpiCard
          label="Mots-clés top 20"
          icon={KeyRound}
          accent="moss"
          value={lastKeywords ? lastKeywords.value : '—'}
          hint={
            lastKeywords && prevKeywords ? (
              <DeltaHint
                delta={lastKeywords.value - prevKeywords.value}
                unit="mot-clé"
                unitPlural="mots-clés"
              />
            ) : (
              'Positions Google détectées (DataForSEO).'
            )
          }
        />
        <KpiCard
          label="Dernier scan"
          icon={CalendarClock}
          accent="ember"
          value={daysSinceLastScan === 0 ? "auj." : `J-${daysSinceLastScan}`}
          hint={
            <>
              {lastScanDate.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
              })}
              {' · '}
              <Link
                href="/sparkscan"
                className="font-medium text-[#4F46E5] hover:underline"
              >
                relancer un scan
              </Link>
            </>
          }
        />
      </section>

      {/* Un seul scan : les courbes n'ont pas encore de sens */}
      {siteScans.length === 1 && (
        <div className="mt-6 rounded-2xl border border-[#E9E5D9] bg-[#EEF0FF]/50 p-5 text-[13.5px] leading-relaxed text-[#3F3D56]">
          Un seul scan pour <span className="font-medium">{selectedHost}</span> pour
          l&apos;instant : les courbes démarrent au deuxième. Relance un scan après
          tes prochaines publications pour mesurer le mouvement.
        </div>
      )}

      {/* Courbes d'évolution : une métrique = une carte (jamais de double axe) */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EvolutionChart
          title="Score de visibilité IA"
          subtitle="Mentions dans les réponses Perplexity · /100"
          points={scorePoints}
          yMax={100}
          unit="/100"
          accent="#4F46E5"
        />
        <EvolutionChart
          title="Mots-clés dans le top 20 Google"
          subtitle="Positions détectées par DataForSEO"
          points={keywordPoints}
          accent="#3E6B4A"
        />
      </section>

      {/* Positions Google mot-clé par mot-clé (table sparkscan_keywords) */}
      <KeywordPositions siteScans={siteScans} keywordRows={keywordRows} />

      {/* Tableau détaillé : la version "données brutes" des courbes */}
      <section className="mt-8">
        <h2
          className="text-[24px] tracking-tight"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          Le détail, scan par scan
        </h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#E9E5D9] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)]">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#E9E5D9] font-mono text-[10px] uppercase tracking-[0.18em] text-[#5E626C]">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Score IA</th>
                <th className="px-5 py-3 font-medium">Rang IA</th>
                <th className="px-5 py-3 font-medium">Mots-clés top 20</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {[...siteScans].reverse().map((scan) => {
                const geo = targetGeoEntry(scan)
                const total = scan.geo_citations?.visibility?.length ?? 0
                return (
                  <tr
                    key={scan.id}
                    className="border-b border-[#F1EEE4] last:border-0 hover:bg-[#F7F5EF]/60"
                  >
                    <td className="px-5 py-3.5 font-mono text-[12px] text-[#0F1115]">
                      {new Date(scan.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-[#0F1115]">
                      {geo ? `${geo.visibility_score}/100` : '—'}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-[#0F1115]">
                      {geo ? `${geo.rank}ᵉ / ${total}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-[#0F1115]">
                      {scan.ranked_keywords_count ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/sparkscan?scan_id=${scan.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[#4F46E5] hover:underline"
                      >
                        Voir le rapport
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#A8ACB5]">
          Scans terminés uniquement · conservés 12 mois
        </p>
      </section>
    </>
  )
}

/**
 * Tes positions Google, mot-clé par mot-clé : dernier scan vs scan précédent.
 * Alimenté par sparkscan_keywords (rempli à chaque scan depuis la migration 056) :
 * les scans plus anciens n'ont pas ce détail, la section l'explique alors.
 */
function KeywordPositions({
  siteScans,
  keywordRows,
}: {
  siteScans: SuiviScanRow[]
  keywordRows: KeywordRow[]
}) {
  const lastScanId = siteScans[siteScans.length - 1]?.id
  const prevScanId = siteScans[siteScans.length - 2]?.id

  const lastRows = keywordRows.filter((k) => k.scan_id === lastScanId)
  const prevByKeyword = new Map(
    keywordRows
      .filter((k) => k.scan_id === prevScanId)
      .map((k) => [k.keyword, k.position]),
  )

  if (lastRows.length === 0) {
    return (
      <section className="mt-8">
        <h2
          className="text-[24px] tracking-tight"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          Tes positions Google, mot-clé par mot-clé
        </h2>
        <div className="mt-4 rounded-2xl border border-[#E9E5D9] bg-white p-6 text-[13.5px] leading-relaxed text-[#5E626C] shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)]">
          Le détail des positions est enregistré à chaque nouveau scan. Ton
          prochain scan remplira ce tableau : mot-clé, position exacte, et à
          partir du suivant, l&apos;évolution place par place.
        </div>
      </section>
    )
  }

  const sorted = [...lastRows].sort((a, b) => a.position - b.position).slice(0, 15)
  const lastKeywordSet = new Set(lastRows.map((k) => k.keyword))
  const lostCount = [...prevByKeyword.keys()].filter((k) => !lastKeywordSet.has(k)).length

  return (
    <section className="mt-8">
      <h2
        className="text-[24px] tracking-tight"
        style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
      >
        Tes positions Google, mot-clé par mot-clé
      </h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#E9E5D9] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)]">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#E9E5D9] font-mono text-[10px] uppercase tracking-[0.18em] text-[#5E626C]">
              <th className="px-5 py-3 font-medium">Mot-clé</th>
              <th className="px-5 py-3 font-medium">Position</th>
              <th className="px-5 py-3 font-medium">Évolution</th>
              <th className="px-5 py-3 font-medium">Volume/mois</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((k) => {
              const prev = prevByKeyword.get(k.keyword)
              return (
                <tr
                  key={k.keyword}
                  className="border-b border-[#F1EEE4] last:border-0 hover:bg-[#F7F5EF]/60"
                >
                  <td className="max-w-[280px] truncate px-5 py-3.5 text-[#0F1115]">
                    {k.keyword}
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-[#0F1115]">
                    #{k.position}
                  </td>
                  <td className="px-5 py-3.5 text-[12.5px]">
                    {prev === undefined ? (
                      prevScanId ? (
                        <span className="font-medium text-[#4F46E5]">nouveau</span>
                      ) : (
                        <span className="text-[#A8ACB5]">—</span>
                      )
                    ) : prev === k.position ? (
                      <span className="text-[#5E626C]">=</span>
                    ) : prev > k.position ? (
                      <span className="font-medium text-[#3E6B4A]">
                        ▲ +{prev - k.position}
                      </span>
                    ) : (
                      <span className="font-medium text-[#B3382C]">
                        ▼ -{k.position - prev}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-[#5E626C]">
                    {k.search_volume !== null
                      ? k.search_volume.toLocaleString('fr-FR')
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#A8ACB5]">
        Top 20 Google · {lastRows.length} mot{lastRows.length > 1 ? 's' : ''}-clé
        {lastRows.length > 1 ? 's' : ''} suivi{lastRows.length > 1 ? 's' : ''}
        {lostCount > 0 && ` · ${lostCount} sorti${lostCount > 1 ? 's' : ''} du top 20`}
      </p>
    </section>
  )
}

/**
 * Delta coloré affiché sous une carte KPI ("▲ +12 pts vs scan précédent").
 * Convention : le delta est TOUJOURS passé "positif = bonne nouvelle"
 * (pour un rang, l'appelant calcule prev - last : gagner des places = positif).
 */
function DeltaHint({
  delta,
  unit,
  unitPlural,
}: {
  delta: number | null
  unit: string
  unitPlural?: string
}) {
  if (delta === null) {
    return <>Premier scan : la comparaison démarre au prochain.</>
  }
  if (delta === 0) {
    return <>Stable depuis le scan précédent.</>
  }
  const improving = delta > 0
  const shown = Math.abs(delta)
  const label = shown > 1 ? (unitPlural ?? `${unit}s`) : unit
  return (
    <span className={improving ? 'font-medium text-[#3E6B4A]' : 'font-medium text-[#B3382C]'}>
      {improving ? '▲ +' : '▼ -'}
      {shown} {label} vs scan précédent
    </span>
  )
}

function EmptySuivi() {
  return (
    <div className="rounded-2xl border border-[#E9E5D9] bg-white p-10 text-center shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)] sm:p-14">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF0FF] text-[#4F46E5]">
        <Sparkles className="h-6 w-6" />
      </span>
      <h1
        className="mt-6 text-[32px] leading-tight tracking-tight sm:text-[40px]"
        style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
      >
        Le suivi démarre avec ton premier scan
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-[14.5px] leading-relaxed text-[#5E626C]">
        Lance un scan SparkScan : chaque scan devient un point sur tes courbes
        (score de visibilité IA, mots-clés Google), et tu verras l&apos;effet de
        tes actions dans le temps.
      </p>
      <Link
        href="/sparkscan"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F1115] px-4 text-[13.5px] font-medium text-[#F7F5EF] transition hover:bg-[#22252C]"
      >
        Lancer un scan
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
