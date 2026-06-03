/**
 * SparkScan — générateur de markdown export pour Claude.
 *
 * Reprend tout le scan dans un format texte propre, prêt à coller dans
 * une conversation Claude pour une analyse stratégique plus poussée
 * (escape Choix 1 du brief originel).
 */

import type { ScanResult } from './sparkscan-container'

export function buildExportMarkdown(
  data: ScanResult,
  targetUrl: string,
  zone: string,
  langue: string,
): string {
  const lines: string[] = []
  const cleanHost = (() => {
    try {
      return new URL(
        targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`,
      ).hostname.replace(/^www\./, '')
    } catch {
      return targetUrl
    }
  })()

  // ─── Header ──────────────────────────────────────────────
  lines.push(`# Export SparkScan — ${cleanHost}`)
  lines.push('')
  lines.push(`> Rapport généré automatiquement par SparkScan.`)
  lines.push(
    `> URL cible : ${targetUrl} · Zone : ${zone} · Langue : ${langue}`,
  )
  lines.push(
    `> Méthode utilisée : ${data.method_used === 'A+C' ? 'SEO (DataForSEO + Competitors)' : 'Locale (Apify Google Maps)'} · Maturité : ${data.maturity_status ?? 'inconnue'}`,
  )
  lines.push(
    `> Coût total du scan : $${data.cost_usd.toFixed(3)} · Scan ID : ${data.scan_id}`,
  )
  lines.push('')

  // ─── Résumé exécutif ─────────────────────────────────────
  const s = data.synthesis
  if (s?.executive_summary) {
    lines.push('## Résumé exécutif')
    lines.push('')
    lines.push(s.executive_summary)
    lines.push('')
  }

  // ─── Vue marché ──────────────────────────────────────────
  if (s?.market_overview) {
    lines.push('## Vue marché')
    lines.push('')
    lines.push(s.market_overview)
    lines.push('')
  }

  // ─── Visibilité IA (GEO) ─────────────────────────────────
  const geo = data.geo_citations
  if (geo && geo.visibility.length > 0) {
    lines.push('## Visibilité dans les moteurs IA')
    lines.push('')
    if (geo.insights) {
      lines.push(`> ${geo.insights}`)
      lines.push('')
    }
    lines.push('**Score de visibilité par acteur :**')
    lines.push('')
    geo.visibility.forEach((v) => {
      lines.push(
        `- **${v.label}** (${v.domain}) — ${v.visibility_score}/100 · ${v.mentions} mentions sur ${v.questions_appeared_in}/${geo.questions_asked.length} questions · rang ${v.rank}`,
      )
    })
    lines.push('')
    lines.push('**Questions posées aux IA :**')
    lines.push('')
    geo.questions_asked.forEach((q, i) => {
      lines.push(`${i + 1}. ${q}`)
    })
    lines.push('')
  }

  // ─── Top 3 priorités ─────────────────────────────────────
  if (s?.top3_priorities && s.top3_priorities.length > 0) {
    lines.push('## Top 3 priorités stratégiques')
    lines.push('')
    s.top3_priorities.forEach((p, i) => {
      lines.push(`### Priorité #${i + 1} — ${p.competitor_label}`)
      lines.push('')
      lines.push(`**Levier choisi** : ${p.lever.toUpperCase()}`)
      lines.push('')
      lines.push(`**Pourquoi ce levier** : ${p.lever_reason}`)
      lines.push('')
      lines.push(`**Action concrète** : ${p.tactical_action}`)
      lines.push('')
      lines.push(`- **Gain estimé** : ${p.estimated_gain}`)
      lines.push(`- **Coût** : ${p.estimated_cost}`)
      lines.push(`- **KPI à 30 jours** : ${p.kpi_30j}`)
      lines.push(`- **Qui le fait** : ${p.who_does_it}`)
      lines.push('')
    })
  }

  // ─── Tous les concurrents enrichis ───────────────────────
  if (data.competitors_enriched && data.competitors_enriched.length > 0) {
    lines.push(`## Détail des ${data.competitors_enriched.length} concurrents qualifiés`)
    lines.push('')
    data.competitors_enriched.forEach((c) => {
      const kindLabel =
        c.kind === 'seo'
          ? 'Concurrent SEO (web)'
          : 'Concurrent local (Google Maps)'
      lines.push(`### #${c.rank} — ${c.label} (${kindLabel})`)
      lines.push('')
      lines.push(
        `**Qualification** : ${c.qualification} · **Score menace** : ${c.relevance_score}/100`,
      )
      lines.push('')
      lines.push(`**Pertinence** : ${c.reason}`)
      lines.push('')
      const e = c.enrichment
      if (e) {
        if (e.positioning) {
          lines.push(`**Positionnement** : ${e.positioning}`)
          lines.push('')
        }
        if (e.strengths.length > 0) {
          lines.push('**Forces** :')
          e.strengths.forEach((x) => lines.push(`- ${x}`))
          lines.push('')
        }
        if (e.weaknesses.length > 0) {
          lines.push('**Faiblesses exploitables** :')
          e.weaknesses.forEach((x) => lines.push(`- ${x}`))
          lines.push('')
        }
        if (e.tactical_action) {
          lines.push(`**Action tactique suggérée** : ${e.tactical_action}`)
          lines.push('')
        }
        if (e.source_quality === 'name_only') {
          lines.push(
            `_(Analyse basée sur le nom uniquement — site inaccessible au moment du scan)_`,
          )
          lines.push('')
        }
      }
      // Stratégie de contenu (blog) si détectée
      if (c.blog && c.blog.has_blog) {
        const b = c.blog
        lines.push(`**Stratégie de contenu (blog)** :`)
        lines.push(
          `- Fréquence : ${b.publication_frequency} · Longueur : ${b.average_length} · Qualité : ${b.editorial_quality}`,
        )
        if (b.dominant_topics.length > 0) {
          lines.push(`- Sujets dominants : ${b.dominant_topics.join(', ')}`)
        }
        if (b.exploitable_gap) {
          lines.push(`- À exploiter : ${b.exploitable_gap}`)
        }
        if (b.blog_url) {
          lines.push(`- URL : ${b.blog_url}`)
        }
        lines.push('')
      }
      // Données brutes pour contexte technique
      if (c.kind === 'seo' && c.raw_seo) {
        const r = c.raw_seo
        const parts: string[] = []
        if (r.shared_keywords) parts.push(`${r.shared_keywords} mots-clés en commun`)
        if (r.estimated_traffic)
          parts.push(`~${Math.round(r.estimated_traffic)} visites/mois estimées`)
        if (r.avg_position) parts.push(`position moyenne ${r.avg_position.toFixed(1)}`)
        if (parts.length) {
          lines.push(`_Données SEO : ${parts.join(' · ')}_`)
          lines.push('')
        }
      }
      if (c.kind === 'local' && c.raw_local) {
        const r = c.raw_local
        const parts: string[] = []
        if (r.rating) parts.push(`note ${r.rating}/5 (${r.reviews ?? 0} avis)`)
        if (r.category) parts.push(r.category)
        if (r.address) parts.push(r.address)
        if (r.website) parts.push(r.website)
        if (parts.length) {
          lines.push(`_Données locales : ${parts.join(' · ')}_`)
          lines.push('')
        }
      }
    })
  }

  // ─── Instructions pour Claude ────────────────────────────
  lines.push('---')
  lines.push('')
  lines.push('## Suggestions de questions à poser à Claude')
  lines.push('')
  lines.push(
    `À partir de cet export, tu peux demander à Claude par exemple :`,
  )
  lines.push('')
  lines.push(
    `- "Analyse ce rapport SparkScan et challenge les 3 priorités. Lesquelles sont vraiment réalistes vs. trop ambitieuses ?"`,
  )
  lines.push(
    `- "Pour la priorité #1, donne-moi un planning détaillé jour par jour sur 30 jours."`,
  )
  lines.push(
    `- "Identifie les 2 concurrents les plus sous-estimés dans cette liste et explique pourquoi."`,
  )
  lines.push(
    `- "Construis un pitch commercial de 2 minutes que je peux dire à mon client pour lui vendre ces 3 priorités."`,
  )
  lines.push('')

  return lines.join('\n')
}

/**
 * Trigger a browser download of a markdown file with the given content.
 */
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
