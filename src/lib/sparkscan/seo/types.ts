import type { SeoSitePreset } from './sites'
export interface OnPageReport {
  url: string
  title: string
  title_length: number
  meta_descriptions: string[]
  meta_count: number
  meta_length: number
  h1: string[]
  h2: string[]
  canonical: boolean
  lang: string
  noindex: boolean
  word_count: number
  excerpt: string
  checks: { id: string; ok: boolean; constat: string }[]
}
export interface SeoKeyword {
  keyword: string
  search_volume: number | null
  difficulty: number | null
  groupe: 'gagne' | 'a_portee' | 'loin' | 'absent'
  position: number | null
  source_position: 'google_local' | 'estimation_france' | null
  ranked_url: string | null
  top3: string[]
}
export interface SeoAi {
  resume: string
  chantiers: { titre: string; pourquoi: string; actions: string[]; mots_cles: string[] }[]
  reecriture: {
    title: { avant: string; apres: string }
    meta_description: { avant: string; apres: string }
    h1: { avant: string; apres: string }
    placement: { mot_cle: string; ou: string }[]
  }
  defauts: { id: string; constat: string; explication: string; correction: string }[]
  attentes: string
}
export interface SeoReport {
  version: 1
  id: string
  site: Pick<SeoSitePreset, 'key' | 'name' | 'url' | 'serpLocation'>
  created_at: string
  onpage: OnPageReport | null
  themes: string[]
  keywords: SeoKeyword[]
  ai: SeoAi
  warnings: string[]
  cost_usd: number
  duration_ms: number
}
