'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'

export type VeilleFiltersState = {
  platform: string
  vertical: string
  format: string
  status: string
  minScore: number
  sort: string
  order: string
}

const PLATFORMS = [
  { value: 'all', label: 'Toutes' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
]

const VERTICALS = [
  { value: 'all', label: 'Toutes' },
  { value: 'livraison_food', label: 'Livraison food' },
  { value: 'livraison_courses', label: 'Livraison courses' },
  { value: 'transport', label: 'Transport' },
  { value: 'services', label: 'Services' },
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'vehicules', label: 'Vehicules' },
  { value: 'super_app', label: 'Super-app' },
  { value: 'parrainage', label: 'Parrainage' },
  { value: 'general', label: 'General' },
]

const FORMATS = [
  { value: 'all', label: 'Tous' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'text', label: 'Texte' },
]

const STATUSES = [
  { value: 'new', label: 'Nouveaux' },
  { value: 'selected', label: 'Selectionnes' },
  { value: 'dismissed', label: 'Rejetes' },
  { value: 'used', label: 'Utilises' },
  { value: 'all', label: 'Tous' },
]

const SCORE_THRESHOLDS = [
  { value: '0', label: 'Tous scores' },
  { value: '40', label: '40+' },
  { value: '60', label: '60+' },
  { value: '80', label: '80+' },
]

const SORT_OPTIONS = [
  { value: 'ai_score', label: 'Score IA' },
  { value: 'collected_at', label: 'Date collecte' },
  { value: 'published_at', label: 'Date publication' },
]

type Props = {
  filters: VeilleFiltersState
  onChange: (filters: VeilleFiltersState) => void
  total: number
}

export function VeilleFilters({ filters, onChange, total }: Props) {
  const update = (key: keyof VeilleFiltersState, value: string | number) => {
    onChange({ ...filters, [key]: value })
  }

  const reset = () => {
    onChange({
      platform: 'all',
      vertical: 'all',
      format: 'all',
      status: 'new',
      minScore: 0,
      sort: 'ai_score',
      order: 'desc',
    })
  }

  const hasActiveFilters =
    filters.platform !== 'all' ||
    filters.vertical !== 'all' ||
    filters.format !== 'all' ||
    filters.status !== 'new' ||
    filters.minScore > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtres</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              Filtres actifs
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{total} post{total > 1 ? 's' : ''}</Badge>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filters.status} onValueChange={(v) => update('status', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.platform} onValueChange={(v) => update('platform', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plateforme" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.vertical} onValueChange={(v) => update('vertical', v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Verticale" />
          </SelectTrigger>
          <SelectContent>
            {VERTICALS.map(v => (
              <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.format} onValueChange={(v) => update('format', v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(filters.minScore)} onValueChange={(v) => update('minScore', parseInt(v))}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Score min" />
          </SelectTrigger>
          <SelectContent>
            {SCORE_THRESHOLDS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sort} onValueChange={(v) => update('sort', v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => update('order', filters.order === 'desc' ? 'asc' : 'desc')}
          title={filters.order === 'desc' ? 'Decroissant' : 'Croissant'}
        >
          {filters.order === 'desc' ? '↓' : '↑'}
        </Button>
      </div>
    </div>
  )
}
