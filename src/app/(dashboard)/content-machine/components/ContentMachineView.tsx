'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContentCard } from './ContentCard'
import {
  Sparkles,
  Calendar,
  Filter,
  FileText,
} from 'lucide-react'

interface Brand {
  id: string
  name: string
  slug?: string
}

interface Asset {
  id: string
  public_url: string
  storage_path: string
  type: string
  prompt?: string
}

interface Content {
  id: string
  text_content: string
  content_type: string
  status: string
  created_at: string
  brand?: Brand
  assets?: Asset[]
}

interface CalendarEntry {
  id: string
  date: string
  content_type: string
  status?: string
  brand?: Brand
}

interface ContentMachineViewProps {
  contents: Content[]
  calendar: CalendarEntry[]
  brands: Brand[]
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const BRAND_DOT_COLORS: Record<string, string> = {
  cobeone: 'bg-violet-400',
  'dcg ai': 'bg-blue-400',
  sparkhub: 'bg-pink-400',
}

const TYPE_DOT_COLORS: Record<string, string> = {
  post: 'bg-emerald-400',
  carrousel: 'bg-amber-400',
  video: 'bg-rose-400',
  story: 'bg-cyan-400',
  reel: 'bg-fuchsia-400',
}

export function ContentMachineView({ contents, calendar, brands }: ContentMachineViewProps) {
  const router = useRouter()
  const [activeBrand, setActiveBrand] = useState<string>('all')

  // Filter contents by selected brand
  const filteredContents = activeBrand === 'all'
    ? contents
    : contents.filter((c) => c.brand?.id === activeBrand)

  // Build week calendar grid
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  const getCalendarForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const filtered = calendar.filter((c) => c.date === dateStr)
    if (activeBrand === 'all') return filtered
    return filtered.filter((c) => c.brand?.id === activeBrand)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const callApprove = async (
    id: string,
    action: 'approve' | 'reject' | 'modify',
    newText?: string,
  ) => {
    try {
      const res = await fetch('/api/content-machine/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: id, action, newText }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`Echec : ${err.error || res.statusText}`)
        return
      }
      router.refresh()
    } catch (e) {
      alert(`Erreur reseau : ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const handleApprove = (id: string) => callApprove(id, 'approve')
  const handleReject = (id: string) => callApprove(id, 'reject')
  const handleEdit = (id: string, text: string) => callApprove(id, 'modify', text)
  const handleRegenerate = (id: string) => {
    if (!confirm('Rejeter ce contenu ? Le cron pourra regenerer demain.')) return
    callApprove(id, 'reject')
  }

  const handlePublish = async (id: string) => {
    if (!confirm('Publier sur Facebook + Instagram ?')) return
    try {
      const res = await fetch('/api/content-machine/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(`Echec publication : ${data.error || res.statusText}`)
        return
      }
      const fb = data.results?.facebook
      const ig = data.results?.instagram
      const lines = [
        fb ? `Facebook : ${fb.ok ? 'OK (' + fb.postId + ')' : 'echec — ' + fb.error}` : null,
        ig ? `Instagram : ${ig.ok ? 'OK (' + ig.postId + ')' : 'echec — ' + ig.error}` : null,
      ].filter(Boolean).join('\n')
      alert(lines || 'Publication terminee')
      router.refresh()
    } catch (e) {
      alert(`Erreur reseau : ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const pendingCount = filteredContents.filter((c) => c.status === 'pending').length
  const approvedCount = filteredContents.filter((c) => c.status === 'approved').length

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            DCG Content Machine
          </h1>
          <p className="mt-2 text-slate-400">
            Contenu genere automatiquement pour tes marques.
            {pendingCount > 0 && (
              <span className="ml-2 text-yellow-400 font-medium">
                {pendingCount} en attente de validation
              </span>
            )}
            {approvedCount > 0 && (
              <span className="ml-2 text-green-400 font-medium">
                {approvedCount} approuve{approvedCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Brand filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
        <button
          onClick={() => setActiveBrand('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeBrand === 'all'
              ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white border border-white/15'
              : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-slate-300'
          }`}
        >
          Toutes
        </button>
        {brands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => setActiveBrand(brand.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeBrand === brand.id
                ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white border border-white/15'
                : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-slate-300'
            }`}
          >
            {brand.name}
          </button>
        ))}
      </div>

      {/* Today's Content */}
      <section>
        <h2 className="font-heading text-lg sm:text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Contenu du jour
        </h2>

        {filteredContents.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={handleEdit}
                onRegenerate={handleRegenerate}
                onPublish={handlePublish}
              />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <FileText className="h-8 w-8 text-slate-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">
              Aucun contenu genere aujourd&apos;hui
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Le cron auto genere les contenus chaque nuit a 4h (Guadeloupe)
              selon le calendrier editorial. Reviens demain matin pour valider.
            </p>
          </div>
        )}
      </section>

      {/* Weekly Calendar */}
      <section>
        <h2 className="font-heading text-lg sm:text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Calendrier de la semaine
        </h2>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 sm:gap-3 min-w-[500px]">
            {weekDays.map((date, i) => {
              const entries = getCalendarForDate(date)
              const dayNum = date.getDate()
              const today = isToday(date)

              return (
                <div
                  key={i}
                  className={`rounded-xl p-3 min-h-[120px] transition-colors ${
                    today
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${today ? 'text-primary' : 'text-slate-500'}`}>
                      {DAY_LABELS[i]}
                    </span>
                    <span className={`text-sm font-semibold ${today ? 'text-primary' : 'text-slate-400'}`}>
                      {dayNum}
                    </span>
                  </div>

                  {entries.length > 0 ? (
                    <div className="space-y-1.5">
                      {entries.map((entry) => {
                        const brandKey = entry.brand?.name?.toLowerCase() || ''
                        const dotColor = BRAND_DOT_COLORS[brandKey] || 'bg-slate-400'
                        const typeColor = TYPE_DOT_COLORS[entry.content_type] || 'bg-slate-400'

                        return (
                          <div
                            key={entry.id}
                            className="flex items-center gap-1.5 p-1.5 rounded-md bg-white/5"
                          >
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dotColor}`} />
                            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${typeColor}`} />
                            <span className="text-[10px] text-slate-400 truncate">
                              {entry.content_type}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-600 mt-2">Rien</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/5">
            <span className="text-xs text-slate-500 font-medium">Marques :</span>
            {brands.map((brand) => {
              const dotColor = BRAND_DOT_COLORS[brand.name.toLowerCase()] || 'bg-slate-400'
              return (
                <div key={brand.id} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                  <span className="text-xs text-slate-400">{brand.name}</span>
                </div>
              )
            })}
            <span className="text-xs text-slate-500 font-medium ml-2">Types :</span>
            {Object.entries(TYPE_DOT_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${color}`} />
                <span className="text-xs text-slate-400 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Empty calendar state */}
        {calendar.length === 0 && (
          <div className="mt-4 backdrop-blur-xl bg-white/[0.02] border border-white/5 rounded-xl p-6 text-center">
            <Calendar className="h-6 w-6 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              Aucun contenu planifie cette semaine.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
