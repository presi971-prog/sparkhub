/**
 * Convertisseur markdown → HTML minimaliste pour les publications blog GHL.
 *
 * Pourquoi pas `marked` / `remark` : on n'a aucune lib markdown dans le
 * package.json et on ne veut pas l'ajouter pour un converter qui sera
 * appelé 1 fois par article. Le markdown produit par Claude est très
 * structuré (H1/H2/H3, gras, italique, listes, liens, code inline,
 * tables, blocs JSON-LD). On couvre ces cas-là proprement.
 *
 * R0 anti-régression : utilisé uniquement pour la publication blog GHL,
 * l'affichage UI continue d'utiliser le markdown brut.
 *
 * R0 r0-ghl-blog-pas-de-hero-dans-rawhtml : on n'insère JAMAIS d'`<img>`
 * hero ici. Le H1 peut être retiré via l'option `stripH1` pour éviter
 * un doublon avec le titre natif GHL.
 */

/** Options optionnelles pour `markdownToHtml`. */
export interface MarkdownToHtmlOptions {
  /**
   * Si true, le premier H1 trouvé est retiré du HTML rendu. Utile pour
   * publier sur GHL : GHL affiche déjà son propre H1 depuis le champ
   * `title`, donc garder le H1 dans le rawHTML créerait un doublon.
   */
  stripH1?: boolean
}

/** Échappe les caractères HTML dans une chaîne brute. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Applique les transformations inline (gras, italique, code, liens). */
function processInline(text: string): string {
  let out = escapeHtml(text)

  // Code inline : `code` (en premier pour ne pas traiter le contenu des backticks).
  out = out.replace(/`([^`]+)`/g, (_, c: string) => `<code>${c}</code>`)

  // Liens markdown : [label](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label: string, url: string) =>
      `<a href="${url.trim()}" rel="noopener">${label}</a>`,
  )

  // Gras : **texte** (avant italique pour éviter les conflits).
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italique : *texte* ou _texte_
  out = out.replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
  out = out.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>')

  return out
}

/**
 * Extrait le premier H1 d'un markdown (utile pour récupérer le titre de
 * l'article séparé du corps).
 *
 * On regarde uniquement les ~200 premiers caractères : le H1 doit être
 * en début de document, sinon on considère qu'il n'y en a pas.
 *
 * @returns Le texte du H1 (sans `# ` ni whitespace), ou null si aucun
 * H1 trouvé en début de document.
 */
export function extractH1(markdown: string): string | null {
  if (!markdown) return null
  const head = markdown.slice(0, 200)
  // On cherche un H1 en début de ligne (multiline) — pas un # collé
  // dans du texte au milieu d'un paragraphe.
  const match = /^#\s+(.+?)\s*$/m.exec(head)
  if (!match) return null
  const title = match[1].trim()
  return title.length > 0 ? title : null
}

/**
 * Détecte si un bloc de code JSON est en réalité du Schema.org
 * (JSON-LD). Si oui, on le rendra en `<script type="application/ld+json">`
 * pour être lu par Google/IA sans s'afficher comme du code visible.
 */
function isSchemaOrgJson(lang: string, content: string): boolean {
  const normalizedLang = lang.toLowerCase().trim()
  const isJsonLang =
    normalizedLang === 'json' ||
    normalizedLang === 'json-ld' ||
    normalizedLang === 'jsonld' ||
    normalizedLang === 'ld+json'
  if (!isJsonLang) return false
  // Détection robuste : on cherche "@context" + "schema.org" (les
  // guillemets peuvent varier, on ne se base pas sur un match exact).
  return /["']@context["']\s*:\s*["'][^"']*schema\.org/i.test(content)
}

/**
 * Si Claude a généré un bloc JSON Schema.org BRUT (sans triple-backticks),
 * on l'enroule manuellement en \`\`\`json … \`\`\` pour que la logique de
 * rendu principale le détecte comme JSON-LD et le rende en `<script>` au
 * lieu d'un bloc code visible.
 *
 * Heuristique : on cherche une ligne qui commence par `{` (éventuellement
 * indentée), avec dans les 30 lignes qui suivent un `"@context"` pointant
 * sur schema.org. Si trouvé, on cherche la `}` de fermeture (compteur
 * d'accolades) et on enroule.
 */
function wrapRawSchemaJsonLd(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const result: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    // Si on est déjà dans un bloc code, on passe (déjà bien wrappé).
    if (line.trim().startsWith('```')) {
      result.push(line)
      i++
      // Recopie jusqu'à la prochaine ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        result.push(lines[i])
        i++
      }
      if (i < lines.length) {
        result.push(lines[i])
        i++
      }
      continue
    }
    // Détection : ligne commence par { et schema.org dans les 30 lignes suivantes.
    if (/^\s*\{\s*$/.test(line) || /^\s*\{\s*"/.test(line)) {
      const lookahead = lines
        .slice(i, Math.min(i + 30, lines.length))
        .join('\n')
      if (/["']@context["']\s*:\s*["'][^"']*schema\.org/i.test(lookahead)) {
        // On a un bloc JSON-LD brut. Cherche la `}` de fermeture par compteur.
        let depth = 0
        let end = i
        for (let j = i; j < lines.length; j++) {
          for (const ch of lines[j]) {
            if (ch === '{') depth++
            else if (ch === '}') depth--
          }
          if (depth === 0) {
            end = j
            break
          }
        }
        // On enroule en ```json ... ```
        result.push('```json')
        for (let k = i; k <= end; k++) result.push(lines[k])
        result.push('```')
        i = end + 1
        continue
      }
    }
    result.push(line)
    i++
  }
  return result.join('\n')
}

/**
 * Convertit un bloc tableau Markdown en HTML.
 *
 * Format attendu :
 *   | header1 | header2 |
 *   |---------|---------|
 *   | cell1   | cell2   |
 *
 * Les `|` en début/fin de ligne sont optionnels (on tolère les deux
 * formes). Le séparateur peut contenir `:` pour l'alignement (on les
 * ignore — pas d'alignement géré, GHL n'en a pas besoin).
 */
function renderTable(rows: string[]): string {
  // rows[0] = header, rows[1] = separator (déjà validé), rows[2+] = body.
  const parseCells = (line: string): string[] => {
    let trimmed = line.trim()
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
    return trimmed.split('|').map((c) => c.trim())
  }
  const header = parseCells(rows[0])
  const body = rows.slice(2).map(parseCells)

  const headerHtml = header
    .map((cell) => `<th>${processInline(cell)}</th>`)
    .join('')
  const bodyHtml = body
    .map(
      (cells) =>
        `<tr>${cells.map((cell) => `<td>${processInline(cell)}</td>`).join('')}</tr>`,
    )
    .join('')

  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`
}

/** Détecte si une ligne ressemble à une ligne de tableau markdown. */
function isTableLine(line: string): boolean {
  const t = line.trim()
  return t.startsWith('|') || /\s\|\s/.test(t)
}

/** Détecte si une ligne est un séparateur de tableau (`|---|---|`). */
function isTableSeparator(line: string): boolean {
  const t = line.trim()
  // Doit contenir au moins un `---` entre des `|`, tolère `:`.
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(t)
}

/**
 * Convertit du markdown en HTML simple (h1-h6, p, ul, ol, li, blockquote,
 * pre/code, hr, tables, gras/italique/lien/code inline, et JSON-LD
 * `<script type="application/ld+json">` pour les blocs Schema.org).
 *
 * Pas d'image (les images blog GHL passent par `imageUrl` du payload,
 * JAMAIS par le rawHTML — cf. R0 r0-ghl-blog-pas-de-hero-dans-rawhtml).
 */
export function markdownToHtml(
  markdown: string,
  options: MarkdownToHtmlOptions = {},
): string {
  if (!markdown || markdown.trim().length === 0) return ''

  const stripH1 = options.stripH1 === true
  let h1Stripped = false

  // Pre-pass : si Claude a généré un bloc JSON Schema.org brut (sans
  // triple-backticks ```json), on l'enroule manuellement pour que la
  // logique de rendu ci-dessous le détecte comme JSON-LD et le rende
  // en `<script>` invisible (au lieu d'un bloc code visible).
  const wrappedMarkdown = wrapRawSchemaJsonLd(markdown)

  const lines = wrappedMarkdown.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let paragraph: string[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inCodeBlock = false
  let codeBlockLines: string[] = []
  let codeBlockLang = ''

  function flushParagraph() {
    if (paragraph.length === 0) return
    const text = paragraph.join(' ').trim()
    if (text.length > 0) {
      out.push(`<p>${processInline(text)}</p>`)
    }
    paragraph = []
  }

  function flushList() {
    if (listItems.length === 0 || !listType) return
    out.push(`<${listType}>`)
    for (const item of listItems) {
      out.push(`<li>${processInline(item)}</li>`)
    }
    out.push(`</${listType}>`)
    listItems = []
    listType = null
  }

  function flushAll() {
    flushParagraph()
    flushList()
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Bloc code ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // Fermeture : on décide si c'est du JSON-LD ou un bloc code normal.
        const content = codeBlockLines.join('\n')
        if (isSchemaOrgJson(codeBlockLang, content)) {
          // JSON-LD : on insère un script Schema.org (invisible côté
          // visiteur, lu par les bots Google / IA pour le SEO/GEO).
          // On ne fait PAS d'escapeHtml ici : le JSON brut est valide
          // dans un <script> tant qu'il ne contient pas la séquence
          // `</script`. On la neutralise par précaution.
          const safe = content.replace(/<\/script/gi, '<\\/script')
          out.push(`<script type="application/ld+json">${safe}</script>`)
        } else {
          out.push(
            `<pre><code${codeBlockLang ? ` class="language-${codeBlockLang}"` : ''}>${escapeHtml(content)}</code></pre>`,
          )
        }
        inCodeBlock = false
        codeBlockLines = []
        codeBlockLang = ''
      } else {
        flushAll()
        inCodeBlock = true
        codeBlockLang = line.trim().slice(3).trim()
      }
      continue
    }
    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    // Ligne vide → fin de paragraphe / fin de liste
    if (line.trim().length === 0) {
      flushAll()
      continue
    }

    // Tableau Markdown : ligne pipes + ligne séparateur juste après.
    if (
      isTableLine(line) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      flushAll()
      const tableRows: string[] = [line, lines[i + 1]]
      let j = i + 2
      while (j < lines.length && isTableLine(lines[j])) {
        tableRows.push(lines[j])
        j++
      }
      out.push(renderTable(tableRows))
      i = j - 1
      continue
    }

    // Headings
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line)
    if (headingMatch) {
      flushAll()
      const level = headingMatch[1].length
      const content = processInline(headingMatch[2].trim())
      if (stripH1 && level === 1 && !h1Stripped) {
        // On saute le premier H1 — il sera affiché par GHL via le champ
        // `title` du payload, pas par le rawHTML.
        h1Stripped = true
        continue
      }
      out.push(`<h${level}>${content}</h${level}>`)
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      flushAll()
      out.push('<hr />')
      continue
    }

    // Liste à puces
    const ulMatch = /^[-*+]\s+(.+)$/.exec(line)
    if (ulMatch) {
      flushParagraph()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(ulMatch[1].trim())
      continue
    }

    // Liste numérotée
    const olMatch = /^\d+\.\s+(.+)$/.exec(line)
    if (olMatch) {
      flushParagraph()
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(olMatch[1].trim())
      continue
    }

    // Citation
    const blockquoteMatch = /^>\s?(.*)$/.exec(line)
    if (blockquoteMatch) {
      flushAll()
      out.push(`<blockquote><p>${processInline(blockquoteMatch[1].trim())}</p></blockquote>`)
      continue
    }

    // Sinon : ligne de paragraphe normale
    flushList()
    paragraph.push(line.trim())
  }

  // Flush final
  if (inCodeBlock) {
    // Bloc code non fermé : on le rend en pre/code par sécurité (pas
    // de détection JSON-LD ici, c'est probablement cassé).
    out.push(`<pre><code>${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`)
  }
  flushAll()

  return out.join('\n')
}

/**
 * Slugifie un titre pour en faire une URL propre.
 * Ex : "L'IA pour les restaurants en Guadeloupe" → "l-ia-pour-les-restaurants-en-guadeloupe"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Extrait un extrait texte plat du début du HTML (meta description, ~160 chars).
 * Strip toutes les balises et garde le premier paragraphe utile.
 *
 * Ignore les balises `<script>` (notamment JSON-LD) pour ne pas polluer
 * la meta description avec du JSON.
 */
export function extractFirstParagraph(html: string, maxLen = 155): string {
  if (!html) return ''
  // Strip d'abord les blocs script (incluant JSON-LD) qui n'ont rien à
  // faire dans une description.
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  // Strip balises
  const text = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLen) return text
  // Coupe au mot le plus proche.
  const slice = text.slice(0, maxLen)
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice) + '…'
}
