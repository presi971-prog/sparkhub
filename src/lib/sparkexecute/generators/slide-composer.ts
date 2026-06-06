/**
 * SparkExecute — composition d'une slide de carrousel.
 *
 * Principe (fiabilité accents) : l'IA fournit un DÉCOR SANS TEXTE, et on écrit
 * le texte PAR-DESSUS avec une vraie police via sharp + SVG. Résultat : accents
 * français toujours corrects (é è ê à â î ô û ç), contrairement au texte dessiné
 * par gpt-image-1 qui glisse des fautes ("tàches" au lieu de "tâches").
 *
 * Sortie : un buffer PNG 1024×1024 prêt à héberger.
 *
 * Note police : on utilise Georgia (serif présent sur macOS — environnement de
 * dev actuel). En déploiement Linux, prévoir d'embarquer une police serif.
 */

import sharp from 'sharp'

import { NOTO_SANS_B64 } from '../fonts/noto-sans-base64'

const SIZE = 1024
const EMERALD = '#14533B'
const CREAM = '#F4ECD8'
// Police EMBARQUÉE (base64) → rendu identique en local ET en ligne (Linux/Vercel),
// sans dépendre des polices système (qui n'existent pas sur le serveur).
const FONT_FAMILY = 'SparkSerif'
const FONT_FACE = `<defs><style>@font-face{font-family:'${FONT_FAMILY}';src:url(data:font/ttf;base64,${NOTO_SANS_B64}) format('truetype');}</style></defs>`

interface ComposeArgs {
  background: Buffer
  headline: string
  subtext: string
  index: number
  total: number
}

export async function composeCarouselSlide(args: ComposeArgs): Promise<Buffer> {
  const headlineLines = wrap(args.headline, 16)
  const subtextLines = wrap(args.subtext, 32)

  const HEAD_SIZE = headlineLines.length > 2 ? 64 : 78
  const HEAD_LH = HEAD_SIZE + 12
  const SUB_SIZE = 34
  const SUB_LH = SUB_SIZE + 10
  const GAP = 40

  const headBlock = headlineLines.length * HEAD_LH
  const subBlock = subtextLines.length * SUB_LH
  const totalH = headBlock + (subtextLines.length ? GAP + subBlock : 0)

  // Bloc de texte centré verticalement (légèrement au-dessus du centre).
  let y = (SIZE - totalH) / 2 - 20 + HEAD_SIZE

  const headTspans = headlineLines
    .map((line, i) => {
      const dy = i === 0 ? 0 : HEAD_LH
      return `<tspan x="${SIZE / 2}" dy="${dy}">${esc(line)}</tspan>`
    })
    .join('')

  const subStartDy = HEAD_LH * (headlineLines.length - 1) + GAP + SUB_SIZE
  const subTspans = subtextLines
    .map((line, i) => {
      const dy = i === 0 ? subStartDy : SUB_LH
      return `<tspan x="${SIZE / 2}" dy="${dy}">${esc(line)}</tspan>`
    })
    .join('')

  // Bandeau crème translucide derrière le texte (lisibilité quel que soit le décor).
  const panelPad = 70
  const panelY = y - HEAD_SIZE - panelPad / 2
  const panelH = totalH + panelPad

  // Le titre est "gras" simulé par un léger contour (on n'embarque que le
  // Regular pour rester léger) → rendu fiable et net partout.
  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    ${FONT_FACE}
    <rect x="60" y="${panelY}" width="${SIZE - 120}" height="${panelH}" rx="28"
          fill="${CREAM}" fill-opacity="0.62"/>
    <text font-family="${FONT_FAMILY}" font-size="${HEAD_SIZE}"
          fill="${EMERALD}" stroke="${EMERALD}" stroke-width="1.1"
          text-anchor="middle" y="${y}">${headTspans}</text>
    <text font-family="${FONT_FAMILY}" font-size="${SUB_SIZE}"
          fill="${EMERALD}" text-anchor="middle" y="${y}">${subTspans}</text>
    <text font-family="${FONT_FAMILY}" font-size="22" fill="${EMERALD}" fill-opacity="0.75"
          text-anchor="end" x="${SIZE - 40}" y="${SIZE - 36}">${args.index}/${args.total}</text>
  </svg>`

  return sharp(args.background)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer()
}

/** Découpe un texte en lignes d'au plus `maxChars` caractères (coupe aux mots). */
function wrap(text: string, maxChars: number): string[] {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (current.length === 0) {
      current = word
    } else if ((current + ' ' + word).length <= maxChars) {
      current += ' ' + word
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Échappe les caractères spéciaux XML pour insertion dans le SVG. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
