import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SEO_SITES, getSeoSite, type SeoSitePreset } from '@/lib/sparkscan/seo/sites'
import { sanitizeTargetUrl } from '@/lib/sparkscan/seo/url-guard'
import { runSeoReport } from '@/lib/sparkscan/seo/pipeline'
import { getSeoReport, lastReportDates, listSeoReports, saveSeoReport, validateSeoPath } from '@/lib/sparkscan/seo/storage'
export const maxDuration = 300
const running = new Set<string>()
const failure = (err: unknown) => NextResponse.json({ error: err instanceof Error ? err.message : 'Analyse impossible, veuillez réessayer.' }, { status: 500 })
async function user() { const client = await createClient(); return (await client.auth.getUser()).data.user }
export async function GET(req: Request) {
  const current = await user()
  if (!current) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const params = new URL(req.url).searchParams
  const key = params.get('site'), id = params.get('id')
  try { if (key) validateSeoPath(key); if (id) validateSeoPath(id) }
  catch { return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 }) }
  try {
    if (!key) {
      const dates = await lastReportDates(current.id, SEO_SITES.map(s => s.key))
      return NextResponse.json({ sites: SEO_SITES.map(s => ({ ...s, last: dates[s.key] })) })
    }
    if (id) return NextResponse.json({ report: await getSeoReport(current.id, key, id) })
    const reports = await listSeoReports(current.id, key)
    return NextResponse.json({ reports, latest: reports[0] ? await getSeoReport(current.id, key, reports[0].id) : null })
  } catch (err) { return failure(err) }
}
export async function POST(req: Request) {
  const current = await user()
  if (!current) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  let site: SeoSitePreset
  try {
    const body = await req.json()
    if (!body || typeof body !== 'object') throw new Error('Demande invalide.')
    if (body.site) {
      const preset = typeof body.site === 'string' ? getSeoSite(body.site) : undefined
      if (!preset) throw new Error('Site inconnu.')
      site = preset
    } else {
      if (typeof body.url !== 'string' || !body.url.trim()) throw new Error('Une adresse de site est requise.')
      const url = sanitizeTargetUrl(body.url.trim())
      const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
      site = { key: `autre-${domain}`, name: domain, url, serpLocation: 'Guadeloupe', description: '', seedHints: [] }
    }
    validateSeoPath(site.key)
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Demande invalide.' }, { status: 400 }) }
  const lock = `${current.id}/${site.key}`
  const busy = () => NextResponse.json({ error: "Une analyse vient d'être faite, patientez 2 minutes." }, { status: 429 })
  if (running.has(lock)) return busy()
  running.add(lock)
  try {
    const latest = (await listSeoReports(current.id, site.key))[0]
    if (latest && Date.now() - Date.parse(latest.created_at) < 120000) return busy()
    const report = await runSeoReport({ site, userId: current.id })
    await saveSeoReport(current.id, report)
    return NextResponse.json({ report })
  } catch (err) { return failure(err) }
  finally { running.delete(lock) }
}
