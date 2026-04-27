'use client'

import { useState } from 'react'
import {
  Check,
  X,
  Pencil,
  RefreshCw,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react'

// Brand color mapping (badges sur fond blanc)
const BRAND_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  cobeone: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'dcg ai': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  sparkhub: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  post: { label: 'Post', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  carrousel: { label: 'Carrousel', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  video: { label: 'Video', color: 'bg-rose-50 text-rose-700 border border-rose-200' },
  story: { label: 'Story', color: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
  reel: { label: 'Reel', color: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200' },
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
  approved: { label: 'Approuve', color: 'bg-green-50 text-green-800 border-green-300' },
  rejected: { label: 'Rejete', color: 'bg-red-50 text-red-800 border-red-300' },
  publishing: { label: 'Publication...', color: 'bg-cyan-50 text-cyan-800 border-cyan-300' },
  published: { label: 'Publie', color: 'bg-blue-50 text-blue-800 border-blue-300' },
  publish_failed: { label: 'Echec publi.', color: 'bg-orange-50 text-orange-800 border-orange-300' },
  modified: { label: 'Modifie', color: 'bg-purple-50 text-purple-800 border-purple-300' },
}

interface ContentCardProps {
  content: {
    id: string
    text_content: string
    content_type: string
    status: string
    created_at: string
    brand?: {
      id: string
      name: string
      slug?: string
    }
    assets?: Array<{
      id: string
      public_url: string
      storage_path: string
      type: string
      prompt?: string
    }>
  }
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onEdit?: (id: string, text: string) => void
  onRegenerate?: (id: string) => void
}

export function ContentCard({
  content,
  onApprove,
  onReject,
  onEdit,
  onRegenerate,
}: ContentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(content.text_content || '')
  const [copied, setCopied] = useState(false)

  const brandKey = content.brand?.name?.toLowerCase() || ''
  const brandStyle = BRAND_COLORS[brandKey] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
  const contentTypeKey = content.content_type === 'post_image' ? 'post' : content.content_type
  const typeStyle = TYPE_LABELS[contentTypeKey] || { label: content.content_type, color: 'bg-slate-50 text-slate-700 border border-slate-200' }
  const statusStyle = STATUS_STYLES[content.status] || STATUS_STYLES.pending

  const text = content.text_content || ''
  const textLines = text.split('\n')
  const isLong = textLines.length > 3 || text.length > 200

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback silencieux
    }
  }

  const handleDownloadAssets = () => {
    content.assets?.forEach((asset) => {
      const link = document.createElement('a')
      link.href = asset.public_url || asset.storage_path
      link.download = `asset-${asset.id}.png`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    })
  }

  const handleSaveEdit = () => {
    if (onEdit && editText !== text) {
      onEdit(content.id, editText)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditText(text)
    setIsEditing(false)
  }

  const images = content.assets?.filter((a) => a.type === 'image' || a.type === 'carousel_slide') || []

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      {/* Header: brand + type + status */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {content.brand && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${brandStyle.bg} ${brandStyle.text} ${brandStyle.border}`}>
            {content.brand.name}
          </span>
        )}
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeStyle.color}`}>
          {typeStyle.label}
        </span>
        <span className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyle.color}`}>
          {statusStyle.label}
        </span>
      </div>

      {/* Text content */}
      <div className="mb-4">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-green-100 text-green-800 border border-green-200 text-xs font-medium hover:bg-green-200 transition-colors"
              >
                Enregistrer
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Premiere ligne = titre (format genere par Claude : "TITRE\n\ndescription") */}
            {(() => {
              const firstNewline = text.indexOf('\n')
              const hasTitle = firstNewline > 0 && firstNewline < 120
              const title = hasTitle ? text.slice(0, firstNewline).trim() : null
              const body = hasTitle ? text.slice(firstNewline).trim() : text
              return (
                <>
                  {title && (
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 leading-snug">
                      {title}
                    </h3>
                  )}
                  <p className={`text-base text-slate-800 leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                    {body || 'Aucun texte'}
                  </p>
                </>
              )
            })()}
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Voir moins
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Voir plus
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className={`grid gap-2 mb-4 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : images.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {images.slice(0, 4).map((asset) => (
            <div
              key={asset.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.public_url || ''}
                alt=""
                className="w-full h-full object-cover"
              />
              {images.length > 4 && asset === images[3] && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">+{images.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
          <ImageIcon className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-600">Aucun visuel</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
        {/* Primary actions */}
        {content.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove?.(content.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 border border-green-200 text-xs font-medium hover:bg-green-200 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Approuver
            </button>
            <button
              onClick={() => onReject?.(content.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-800 border border-red-200 text-xs font-medium hover:bg-red-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Rejeter
            </button>
          </>
        )}

        {/* Secondary actions */}
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium hover:bg-slate-200 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editer
        </button>
        <button
          onClick={() => onRegenerate?.(content.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerer
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium hover:bg-slate-200 transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? 'Copie !' : 'Copier'}
        </button>
        {images.length > 0 && (
          <button
            onClick={handleDownloadAssets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium hover:bg-blue-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Assets
          </button>
        )}
      </div>
    </div>
  )
}
