'use client'

/**
 * Courbe d'évolution d'une métrique SparkScan dans le temps (page Suivi).
 *
 * SVG natif (pas de lib de charts) : une série unique, ligne 2px, points 8px,
 * survol = repère vertical + infobulle (date, valeur, delta vs scan précédent).
 * Une seule échelle Y par graphe — jamais de double axe : score IA et
 * mots-clés ont chacun leur propre carte.
 */

import { useMemo, useRef, useState } from 'react'

export interface EvolutionPoint {
  /** Date ISO du scan (created_at). */
  date: string
  value: number
}

interface EvolutionChartProps {
  /** Titre de la carte (nomme la série : pas besoin de légende). */
  title: string
  /** Sous-titre mono (source de la mesure). */
  subtitle?: string
  points: EvolutionPoint[]
  /** Borne haute fixe de l'axe Y (ex : 100 pour un score). Sinon auto. */
  yMax?: number
  /** Suffixe affiché dans l'infobulle (ex : "/100" ou "mots-clés"). */
  unit?: string
  /** Couleur de la série (défaut : indigo SparkPilot). */
  accent?: string
}

const HEIGHT = 240
const PAD = { top: 18, right: 20, bottom: 30, left: 42 }

export function EvolutionChart({
  title,
  subtitle,
  points,
  yMax,
  unit = '',
  accent = '#4F46E5',
}: EvolutionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  // Largeur fluide : on lit la largeur réelle du conteneur au rendu client.
  const [width, setWidth] = useState(640)
  const measure = (node: HTMLDivElement | null) => {
    containerRef.current = node
    if (node && node.clientWidth > 0 && node.clientWidth !== width) {
      setWidth(node.clientWidth)
    }
  }

  const geometry = useMemo(() => {
    if (points.length === 0) return null
    const times = points.map((p) => new Date(p.date).getTime())
    const tMin = Math.min(...times)
    const tMax = Math.max(...times)
    const span = tMax - tMin || 1

    const innerW = width - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom

    const maxValue = yMax ?? Math.max(...points.map((p) => p.value), 1) * 1.15
    const x = (t: number) =>
      points.length === 1
        ? PAD.left + innerW / 2
        : PAD.left + ((t - tMin) / span) * innerW
    const y = (v: number) => PAD.top + innerH - (v / maxValue) * innerH

    const coords = points.map((p, i) => ({
      x: x(times[i]),
      y: y(p.value),
      ...p,
    }))
    return { coords, maxValue, innerH }
  }, [points, width, yMax])

  if (!geometry || points.length === 0) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <p className="py-14 text-center text-[13px] text-[#5E626C]">
          Pas encore de mesure pour cette courbe.
        </p>
      </ChartCard>
    )
  }

  const { coords, maxValue } = geometry
  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ')
  const areaPath =
    coords.length > 1
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT - PAD.bottom} L${coords[0].x.toFixed(1)},${HEIGHT - PAD.bottom} Z`
      : null

  // Graduations : valeurs entières uniques (évite "1 1 1 0" quand le max est petit).
  const gridValues = [...new Set([0.25, 0.5, 0.75, 1].map((f) => Math.round(maxValue * f)))].filter(
    (v) => v > 0,
  )
  const last = coords[coords.length - 1]
  const hoveredPoint = hovered !== null ? coords[hovered] : null

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    let nearest = 0
    let best = Infinity
    coords.forEach((c, i) => {
      const d = Math.abs(c.x - mx)
      if (d < best) {
        best = d
        nearest = i
      }
    })
    setHovered(nearest)
  }

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div ref={measure} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${title} : ${points.length} mesures, dernière valeur ${last.value}${unit}`}
        >
          {/* Grille horizontale discrète + graduations Y */}
          {gridValues.map((v) => {
            const gy = PAD.top + (HEIGHT - PAD.top - PAD.bottom) * (1 - v / maxValue)
            return (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={gy}
                  y2={gy}
                  stroke="#EDEAE0"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={gy + 3}
                  textAnchor="end"
                  className="fill-[#A8ACB5] font-mono text-[10px]"
                >
                  {Math.round(v)}
                </text>
              </g>
            )
          })}
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={HEIGHT - PAD.bottom}
            y2={HEIGHT - PAD.bottom}
            stroke="#E9E5D9"
            strokeWidth={1}
          />

          {/* Dates : première et dernière mesure */}
          <text
            x={coords[0].x}
            y={HEIGHT - 10}
            textAnchor={coords.length === 1 ? 'middle' : 'start'}
            className="fill-[#A8ACB5] font-mono text-[10px]"
          >
            {formatDate(coords[0].date)}
          </text>
          {coords.length > 1 && (
            <text
              x={last.x}
              y={HEIGHT - 10}
              textAnchor="end"
              className="fill-[#A8ACB5] font-mono text-[10px]"
            >
              {formatDate(last.date)}
            </text>
          )}

          {/* Aire + ligne + points */}
          {areaPath && <path d={areaPath} fill={accent} opacity={0.06} />}
          {coords.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke={accent}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={hovered === i ? 5 : 4}
              fill="#FFFFFF"
              stroke={accent}
              strokeWidth={2}
            />
          ))}

          {/* Valeur du dernier point, toujours affichée */}
          <text
            x={last.x}
            y={last.y - 12}
            textAnchor="end"
            className="fill-[#0F1115] font-mono text-[11px] font-medium"
          >
            {last.value}
            {unit}
          </text>

          {/* Repère vertical au survol */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={PAD.top}
              y2={HEIGHT - PAD.bottom}
              stroke="#A8ACB5"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Zone de capture du survol */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={Math.max(width - PAD.left - PAD.right, 0)}
            height={HEIGHT - PAD.top - PAD.bottom}
            fill="transparent"
            onMouseMove={handleMove}
            onMouseLeave={() => setHovered(null)}
          />
        </svg>

        {/* Infobulle */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-[#E9E5D9] bg-white px-3 py-2 shadow-[0_4px_16px_-4px_rgba(15,17,21,0.15)]"
            style={{
              left: Math.min(Math.max(hoveredPoint.x, 70), width - 70),
              top: Math.max(hoveredPoint.y - 64, 0),
            }}
          >
            <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E626C]">
              {new Date(hoveredPoint.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="mt-0.5 whitespace-nowrap text-[14px] font-semibold text-[#0F1115]">
              {hoveredPoint.value}
              {unit}
              {hovered !== null && hovered > 0 && (
                <DeltaBadge delta={hoveredPoint.value - coords[hovered - 1].value} />
              )}
            </p>
          </div>
        )}
      </div>
    </ChartCard>
  )
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="ml-2 text-[11px] font-normal text-[#5E626C]">stable</span>
  }
  const positive = delta > 0
  return (
    <span
      className={`ml-2 text-[11px] font-medium ${positive ? 'text-[#3E6B4A]' : 'text-[#B3382C]'}`}
    >
      {positive ? '+' : ''}
      {delta}
    </span>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#E9E5D9] bg-white p-5 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)]">
      <h3
        className="text-[19px] tracking-tight text-[#0F1115]"
        style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
      >
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5E626C]">
          {subtitle}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </article>
  )
}
