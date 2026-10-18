'use client'
import { useEffect, useRef, useState } from 'react'
import type { SeoSitePreset } from '@/lib/sparkscan/seo/sites'
import type { SeoKeyword, SeoReport } from '@/lib/sparkscan/seo/types'

type SiteCard = SeoSitePreset & { last: string | null }
type History = { id: string; created_at: string }
const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guadeloupe' }).format(new Date(value))
const button = 'rounded-lg bg-pink-700 px-4 py-2 text-sm text-white transition-colors hover:bg-pink-800 disabled:cursor-wait disabled:opacity-50'
const card = 'min-w-0 rounded-xl border border-slate-200 bg-white/70 p-5'
const label = { fontFamily: 'var(--font-geist-mono)' }
const serif = { fontFamily: 'var(--font-instrument-serif)' }
async function request(path: string, init?: RequestInit) {
  const response = await fetch(`/api/sparkscan/seo${path}`, init)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Impossible de charger le rapport.')
  return data
}
function positionText(k: SeoKeyword, report: SeoReport) {
  const source = k.source_position === 'google_local' ? `Google ${report.site.serpLocation}` : k.source_position === 'estimation_france' ? 'estimation France' : 'position non mesurée'
  return `${k.position ?? (k.source_position === 'google_local' ? 'absent des 30 premiers' : 'absent des données disponibles')} (${source})`
}
export function reportToText(r: SeoReport) {
  const a = r.ai
  const lines = [`# ${r.site.name}`, r.site.url, date(r.created_at), '', a.resume, '', '## Vos 3 chantiers']
  a.chantiers.forEach((c, i) => lines.push(`${i + 1}. ${c.titre}`, c.pourquoi, ...c.actions.map(x => `- ${x}`), `Mots-clés : ${c.mots_cles.join(', ')}`, ''))
  lines.push("## Avant / après de votre page d'accueil")
  for (const [name, field] of [['Titre', a.reecriture.title], ['Description', a.reecriture.meta_description], ['Grand titre (H1)', a.reecriture.h1]] as const) {
    lines.push(name, `Avant (${field.avant.length} caractères) : ${field.avant}`, `Après (${field.apres.length} caractères) : ${field.apres}`, '')
  }
  lines.push('Où va chaque mot-clé', ...a.reecriture.placement.map(p => `- ${p.mot_cle} : ${p.ou}`), '', '## Défauts trouvés sur la page')
  a.defauts.forEach(d => {
    lines.push(d.constat)
    if (d.explication.trim()) lines.push(d.explication)
    if (d.correction.trim()) lines.push(`Correction : ${d.correction}`)
    lines.push('')
  })
  if (!a.defauts.length) lines.push(r.onpage ? 'Aucun défaut signalé par les contrôles fournis.' : 'Page non contrôlée.')
  lines.push('## Les mots-clés', 'Volumes mensuels estimés en France.')
  for (const [name, groups] of [['Places à gagner', ['a_portee', 'loin']], ['À conquérir', ['absent']], ['Déjà bien placés', ['gagne']]] as const) {
    lines.push(`### ${name}`)
    const items = r.keywords.filter(k => (groups as readonly string[]).includes(k.groupe))
    if (!items.length) lines.push('Aucun mot-clé dans ce groupe.')
    items.forEach(k => lines.push(`- ${k.keyword} : ${k.search_volume ?? 'inconnu'} recherches/mois ; ${positionText(k, r)} ; les 3 premiers : ${k.top3.join(', ') || 'non mesurés'}`))
  }
  if (r.themes?.length) lines.push(`Thèmes interrogés : ${r.themes.join(', ')}`)
  lines.push('', a.attentes, ...r.warnings.map(w => `Avertissement : ${w}`), `Coût de l'analyse : ${r.cost_usd.toFixed(2).replace('.', ',')} $ · durée ${Math.round(r.duration_ms / 1000)} s`)
  return lines.join('\n')
}
export default function ReferencementClient() {
  const [sites, setSites] = useState<SiteCard[]>([])
  const [selected, setSelected] = useState('')
  const [url, setUrl] = useState('')
  const [report, setReport] = useState<SeoReport | null>(null)
  const [history, setHistory] = useState<History[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const generation = useRef(0)
  useEffect(() => {
    let cancelled = false
    request('').then(data => { if (!cancelled) setSites(data.sites) }).catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [])
  async function select(key: string, id?: string) {
    const token = ++generation.current
    setSelected(key); setLoading(true); setError(''); setReport(null)
    if (!id) setHistory([])
    try {
      const data = await request(`?site=${encodeURIComponent(key)}${id ? `&id=${encodeURIComponent(id)}` : ''}`)
      if (token !== generation.current) return
      if (id) setReport(data.report)
      else { setHistory(data.reports); setReport(data.latest) }
    } catch (e) { if (token === generation.current) setError(e instanceof Error ? e.message : 'Lecture impossible.') }
    finally { if (token === generation.current) setLoading(false) }
  }
  async function analyze(site?: string, targetUrl = url) {
    ++generation.current
    setBusy(true); setLoading(false); setError(''); setNotice('')
    try {
      const data = await request('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(site ? { site } : { url: targetUrl }) })
      const next = data.report as SeoReport
      setSelected(next.site.key); setReport(next)
      setSites(previous => {
        const found = previous.some(s => s.key === next.site.key)
        return found ? previous.map(s => s.key === next.site.key ? { ...s, last: next.created_at } : s) : [...previous, { ...next.site, description: '', seedHints: [], last: next.created_at }]
      })
      setHistory((await request(`?site=${encodeURIComponent(next.site.key)}`)).reports)
    } catch (e) { setError(e instanceof Error ? e.message : 'Analyse impossible.') }
    finally { setBusy(false) }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice('Copié dans le presse-papier.'); setError('') }
    catch { setError("La copie a échoué. Autorisez l'accès au presse-papier dans votre navigateur.") }
  }
  return <div className="mt-10 min-w-0 space-y-10 break-words">
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sites.map(site => <article key={site.key} className={`${card} ${selected === site.key ? 'border-pink-600 ring-1 ring-pink-600' : ''}`}>
        <button type="button" disabled={busy} onClick={() => select(site.key)} className="w-full text-left disabled:opacity-50" aria-pressed={selected === site.key}>
          <h2 className="text-2xl" style={serif}>{site.name}</h2><p className="mt-1 break-all text-sm text-slate-600">{site.url}</p>
          <p className="mt-3 text-xs text-slate-500">{site.last ? `Dernier rapport : ${date(site.last)}` : 'Jamais analysé'}</p>
        </button>
        <button type="button" disabled={busy} onClick={() => analyze(site.key.startsWith('autre-') ? undefined : site.key, site.url)} className={`${button} mt-4`}>Analyser</button>
      </article>)}
      <form className={card} onSubmit={e => { e.preventDefault(); void analyze() }}>
        <h2 className="text-2xl" style={serif}>Autre site</h2><label htmlFor="seo-url" className="mt-3 block text-sm">Adresse du site</label>
        <input id="seo-url" required disabled={busy} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://votre-site.fr" className="mt-2 w-full min-w-0 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-pink-600 focus:outline-none focus:ring-1 focus:ring-pink-600" />
        <button disabled={busy || !url.trim()} className={`${button} mt-4`}>Analyser</button>
      </form>
    </div>
    <div aria-live="polite">{busy && <p className="text-pink-700">Analyse en cours, comptez 1 à 3 minutes.</p>}{loading && <p>Chargement du rapport…</p>}{notice && <p className="text-pink-700">{notice}</p>}</div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
    {selected && history.length > 0 && <div><label htmlFor="seo-history" className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-pink-700" style={label}>Rapports précédents</label><select id="seo-history" disabled={busy || loading} value={report?.id ?? ''} onChange={e => select(selected, e.target.value)} className="max-w-full rounded-lg border border-slate-300 bg-transparent p-3 text-sm"><option value="" disabled>Choisir une date</option>{history.map(h => <option key={h.id} value={h.id}>{date(h.created_at)} (Guadeloupe)</option>)}</select></div>}
    {selected && !report && !loading && !busy && !error && <p>Aucun rapport pour ce site. Lancez une analyse.</p>}
    {report && <div className="min-w-0 space-y-10">
      <section className={card}><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-3xl" style={serif}>{report.site.name}</h2><button type="button" className={button} onClick={() => copy(reportToText(report))}>Copier le rapport</button></div><p className="mt-2 text-xs text-slate-500">{date(report.created_at)} (Guadeloupe)</p><p className="mt-4 leading-relaxed">{report.ai.resume}</p></section>
      <section><h2 className="mb-5 text-3xl" style={serif}>Vos 3 chantiers</h2><div className="grid gap-4 lg:grid-cols-3">{report.ai.chantiers.map((c, i) => <article className={card} key={i}><span className="text-sm text-pink-700" style={label}>0{i + 1}</span><h3 className="mt-3 text-2xl" style={serif}>{c.titre}</h3><p className="mt-3 text-sm leading-relaxed text-slate-600">{c.pourquoi}</p><ul className="mt-4 list-disc space-y-2 pl-5 text-sm">{c.actions.map((action, j) => <li key={j}>{action}</li>)}</ul><div className="mt-4 flex flex-wrap gap-2">{c.mots_cles.map(k => <span key={k} className="rounded-full bg-pink-50 px-3 py-1 text-xs text-pink-800">{k}</span>)}</div></article>)}</div></section>
      <section><h2 className="mb-5 text-3xl" style={serif}>Avant / après de votre page d&apos;accueil</h2><div className="space-y-4">{([
        ['Titre de la page', report.ai.reecriture.title, 60], ['Description', report.ai.reecriture.meta_description, 155], ['Grand titre (H1)', report.ai.reecriture.h1, null],
      ] as const).map(([name, field, limit]) => <article className={card} key={name}><h3 className="mb-4 text-xl" style={serif}>{name}</h3><div className="grid min-w-0 gap-5 md:grid-cols-2">{(['avant', 'apres'] as const).map(side => <div key={side} className="min-w-0"><div className="flex items-center justify-between gap-2"><span style={label} className="text-[11px] uppercase tracking-widest text-slate-500">{side === 'avant' ? 'Avant' : 'Après'}</span>{side === 'apres' && <button type="button" className="text-sm text-pink-700 hover:underline" onClick={() => copy(field.apres)}>Copier</button>}</div><p className="mt-3 whitespace-pre-wrap break-words">{field[side] || 'Non disponible'}</p><p className={`mt-2 text-xs ${limit && field[side].length > limit ? 'text-red-700' : 'text-slate-500'}`}>{field[side].length} caractères{limit ? ` / ${limit}` : ''}</p></div>)}</div></article>)}</div><h3 className="mb-3 mt-6 text-xl" style={serif}>Où va chaque mot-clé</h3><ul className="space-y-2 text-sm">{report.ai.reecriture.placement.map((p, i) => <li key={i}><strong>{p.mot_cle}</strong> : {p.ou}</li>)}</ul></section>
      <section><h2 className="mb-5 text-3xl" style={serif}>Défauts trouvés sur la page</h2><div className="space-y-3">{report.ai.defauts.map((d, i) => <article key={i} className={card}><h3 className="font-medium">{d.constat}</h3><>{d.explication.trim() && <p className="mt-2 text-sm text-slate-600">{d.explication}</p>}{d.correction.trim() && <p className="mt-2 text-sm"><strong>Correction :</strong> {d.correction}</p>}</></article>)}{!report.ai.defauts.length && <p className="text-sm text-slate-600">{report.onpage ? 'Aucun défaut signalé par les contrôles fournis.' : "La page n'a pas pu être contrôlée."}</p>}</div></section>
      <section className="min-w-0"><h2 className="mb-2 text-3xl" style={serif}>Les mots-clés</h2><p className="mb-5 text-sm text-slate-500">Recherches mensuelles estimées en France. Les positions locales sont mesurées séparément.</p>{([
        ['Places à gagner', ['a_portee', 'loin']], ['À conquérir', ['absent']], ['Déjà bien placés', ['gagne']],
      ] as const).map(([title, groups]) => {
        const words = report.keywords.filter(k => (groups as readonly string[]).includes(k.groupe))
        return <div className="mb-6 min-w-0" key={title}><h3 className="mb-3 text-2xl" style={serif}>{title}</h3>{!words.length ? <p className="text-sm text-slate-500">Aucun mot-clé dans ce groupe.</p> : <div className="w-full max-w-full overflow-x-auto rounded-xl border border-slate-200" role="region" aria-label={title} tabIndex={0}><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-white/70 text-xs text-slate-500"><tr>{['Mot-clé', 'Recherches par mois', 'Votre place', 'Les 3 premiers'].map(h => <th key={h} className="p-4 font-normal">{h}</th>)}</tr></thead><tbody>{words.map(k => <tr key={k.keyword} className="border-t border-slate-200"><td className="p-4 font-medium">{k.keyword}</td><td className="p-4">{k.search_volume === null ? 'Inconnu' : k.search_volume.toLocaleString('fr-FR')}</td><td className="p-4">{positionText(k, report)}</td><td className="p-4 text-slate-600">{k.top3.join(', ') || 'Non mesurés'}</td></tr>)}</tbody></table></div>}</div>
      })}{report.themes?.length > 0 && <p className="text-xs text-slate-500">Thèmes interrogés : {report.themes.join(', ')}</p>}</section>
      <p className="text-sm text-slate-600">{report.ai.attentes}</p>
      {report.warnings.length > 0 && <aside className="rounded-xl border border-amber-300 bg-amber-50 p-5"><h2 className="font-medium">Avertissements</h2><ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{report.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></aside>}
      <p className="text-xs text-slate-400">Coût de l&apos;analyse : {report.cost_usd.toFixed(2).replace('.', ',')} $ · durée {Math.round(report.duration_ms / 1000)} s</p>
    </div>}
  </div>
}
