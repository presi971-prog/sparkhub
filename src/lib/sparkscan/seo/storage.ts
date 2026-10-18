import { getSparkScanAdminClient } from '../supabase-admin'
import type { SeoReport } from './types'
const BUCKET = 'sparkscan-seo'
export function validateSeoPath(value: string) {
  if (!/^[a-z0-9._-]+$/.test(value) || value === '.' || value === '..') throw new Error('Identifiant de rapport ou de site invalide.')
  return value
}
function reportDate(id: string, fallback: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})t(\d{2})(\d{2})(\d{2})(\d{3})z$/.exec(id)
  if (!match) return fallback
  const iso = `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`
  const parsed = new Date(iso)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === iso ? iso : fallback
}
async function bucket() {
  const client = getSparkScanAdminClient()
  const { error } = await client.storage.createBucket(BUCKET, { public: false })
  if (error && !/already exists|duplicate/i.test(error.message)) throw new Error(`Rangement des rapports indisponible : ${error.message}`)
  return client.storage.from(BUCKET)
}
function folder(userId: string, siteKey: string) { return `${validateSeoPath(userId)}/${validateSeoPath(siteKey)}` }
export async function saveSeoReport(userId: string, report: SeoReport) {
  const path = `${folder(userId, report.site.key)}/${validateSeoPath(report.id)}.json`
  const store = await bucket()
  const { error } = await store.upload(path, JSON.stringify(report), { contentType: 'application/json', upsert: false })
  if (error) throw new Error(`Rapport non enregistré : ${error.message}`)
}
export async function listSeoReports(userId: string, siteKey: string) {
  const path = folder(userId, siteKey)
  const store = await bucket()
  const { data, error } = await store.list(path, { limit: 20, sortBy: { column: 'name', order: 'desc' } })
  if (error) throw new Error(`Historique indisponible : ${error.message}`)
  return (data ?? []).filter(f => f.name.endsWith('.json')).map(f => {
    const id = f.name.slice(0, -5)
    return { id, created_at: reportDate(id, f.created_at) }
  })
}
export async function getSeoReport(userId: string, siteKey: string, id: string): Promise<SeoReport | null> {
  const path = `${folder(userId, siteKey)}/${validateSeoPath(id)}.json`
  const store = await bucket()
  const { data, error } = await store.download(path)
  if (error) {
    if (/not found|does not exist/i.test(error.message) || ('statusCode' in error && String(error.statusCode) === '404')) return null
    throw new Error(`Lecture du rapport impossible : ${error.message}`)
  }
  return JSON.parse(await data.text()) as SeoReport
}
export async function lastReportDates(userId: string, siteKeys: string[]): Promise<Record<string, string | null>> {
  return Object.fromEntries(await Promise.all(siteKeys.map(async key => [key, (await listSeoReports(userId, key))[0]?.created_at ?? null])))
}
