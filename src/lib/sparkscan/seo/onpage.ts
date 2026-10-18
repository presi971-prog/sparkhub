import type { OnPageReport } from './types'
export type { OnPageReport } from './types'

export const normalizeSeoText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

function decode(text: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ugrave: 'ù', ucirc: 'û', icirc: 'î', iuml: 'ï', ccedil: 'ç', ocirc: 'ô', oelig: 'œ', rsquo: '’', lsquo: '‘', ndash: '–', mdash: '—', rarr: '→', larr: '←', hearts: '♥', check: '✓', hellip: '…', laquo: '«', raquo: '»', euro: '€', pound: '£', yen: '¥', cent: '¢', copy: '©', reg: '®', trade: '™', middot: '·', bull: '•', thinsp: ' ', ensp: ' ', emsp: ' ', shy: '', auml: 'ä', euml: 'ë', ouml: 'ö', uuml: 'ü', yuml: 'ÿ', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', aring: 'å', aelig: 'æ', deg: '°', times: '×', divide: '÷', Eacute: 'É', Egrave: 'È', Ecirc: 'Ê', Agrave: 'À', Acirc: 'Â', Ugrave: 'Ù', Ucirc: 'Û', Icirc: 'Î', Iuml: 'Ï', Ccedil: 'Ç', Ocirc: 'Ô', OElig: 'Œ', Auml: 'Ä', Euml: 'Ë', Ouml: 'Ö', Uuml: 'Ü', Yuml: 'Ÿ', Aacute: 'Á', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Aring: 'Å', AElig: 'Æ' }
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (full, key: string) => {
    if (key.startsWith('#')) {
      const value = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10)
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : full
    }
    return Object.prototype.hasOwnProperty.call(entities, key) ? entities[key] : full
  })
}
const clean = (s: string) => decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
function attrs(tag: string) {
  const result: Record<string, string> = {}
  for (const m of tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) result[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4])
  return result
}
export function analyzeOnPage(html: string, url: string): OnPageReport {
  const document = html.replace(/<!--[^]*?-->/g, '').replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  const title = clean(document.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? '')
  const metas = [...document.matchAll(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)].map(m => attrs(m[0]))
  const descriptions = metas.filter(m => normalizeSeoText(m.name ?? '') === 'description').map(m => m.content ?? '')
  const headings = (name: string) => [...document.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}\\s*>`, 'gi'))].map(m => clean(m[1]))
  const h1 = headings('h1'), h2 = headings('h2').slice(0, 10)
  const canonical = [...document.matchAll(/<link\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)].some(m => normalizeSeoText(attrs(m[0]).rel ?? '').split(/\s+/).includes('canonical'))
  const lang = attrs(document.match(/<html\b(?:[^>"']|"[^"]*"|'[^']*')*>/i)?.[0] ?? '').lang ?? ''
  const noindex = metas.some(m => ['robots', 'googlebot'].includes(normalizeSeoText(m.name ?? '')) && /\b(noindex|none)\b/.test(normalizeSeoText(m.content ?? '')))
  const visible = clean(document.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, ' '))
  const count = visible ? visible.split(/\s+/).length : 0
  const checks: OnPageReport['checks'] = []
  const defects: Record<string, string> = {
    title_absent: "La page n'a pas de titre.",
    meta_absente: "Aucune description n'est écrite pour Google.",
    h1_absent: "La page n'a aucun grand titre (H1).",
    noindex: "La page demande à Google de ne pas l'afficher (noindex).",
    canonical_absent: "Aucune adresse de référence (canonical) n'est déclarée.",
    lang_absent: "La langue de la page n'est pas déclarée.",
    contenu_invisible: count === 0
      ? `Google ne reçoit aucun mot sur cette page : le texte s'affiche après le chargement, Google n'en lit donc presque rien.`
      : `Google ne reçoit que ${count} mot${count > 1 ? 's' : ''} sur cette page : le texte s'affiche après le chargement, Google en lit donc très peu.`,
  }
  const check = (id: string, ok: boolean, constat: string) => checks.push({ id, ok, constat: !ok && defects[id] ? defects[id] : constat })
  check('title_absent', !!title, `Le titre contient ${title.length} caractères.`)
  check('title_trop_long', title.length <= 60, `Le titre contient ${title.length} caractères, maximum conseillé : 60.`)
  check('title_trop_court', title.length >= 30, `Le titre contient ${title.length} caractères, minimum conseillé : 30.`)
  check('meta_absente', descriptions.length > 0, `${descriptions.length} description trouvée sur la page.`)
  check('meta_trop_longue', (descriptions[0]?.length ?? 0) <= 160, `La description contient ${descriptions[0]?.length ?? 0} caractères. Google coupe vers 155 caractères.`)
  check('meta_en_double', descriptions.length <= 1, `${descriptions.length} balises de description trouvées, une seule suffit.`)
  check('h1_absent', h1.length > 0, `${h1.length} grand titre (H1) trouvé.`)
  check('h1_multiples', h1.length <= 1, `${h1.length} grands titres (H1) trouvés, un seul est conseillé.`)
  check('noindex', !noindex, `${noindex ? 1 : 0} interdiction d'indexation trouvée : ${noindex ? 'la page est interdite à Google' : 'la page peut être indexée'}.`)
  check('contenu_invisible', count >= 150, `${count} mots visibles dans le HTML reçu. Sous 150 mots, Google peut lire peu de contenu avant le chargement de l'application.`)
  check('canonical_absent', canonical, `${canonical ? 1 : 0} adresse de référence (canonical) trouvée.`)
  check('lang_absent', !!lang, `${lang ? 1 : 0} langue déclarée${lang ? ` : ${lang}` : ''}.`)
  return { url, title, title_length: title.length, meta_descriptions: descriptions, meta_count: descriptions.length, meta_length: descriptions[0]?.length ?? 0, h1, h2, canonical, lang, noindex, word_count: count, excerpt: visible.slice(0, 3000), checks }
}
