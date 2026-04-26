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

// Brand color mapping
const BRAND_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  cobeone: { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30' },
  'dcg ai': { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  sparkhub: { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30' },
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  post: { label: 'Post', color: 'bg-emerald-500/20 text-emerald-300' },
  carrousel: { label: 'Carrousel', color: 'bg-amber-500/20 text-amber-300' },
  video: { label: 'Video', color: 'bg-rose-500/20 text-rose-300' },
  story: { label: 'Story', color: 'bg-cyan-500/20 text-cyan-300' },
  reel: { label: 'Reel', color: 'bg-fuchsia-500/20 text-fuchsia-300' },
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  approved: { label: 'Approuve', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  rejected: { label: 'Rejete', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  published: { label: 'Publie', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
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
  const brandStyle = BRAND_COLORS[brandKey] || { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' }
  const contentTypeKey = content.content_type === 'post_image' ? 'post' : content.content_type
  const typeStyle = TYPE_LABELS[contentTypeKey] || { label: content.content_type, color: 'bg-slate-500/20 text-slate-300' }
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
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 shadow-2xl hover:-translate-y-1 hover:shadow-primary/5 transition-all duration-300">
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
              className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 resize-y"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 text-xs font-medium hover:bg-green-500/30 transition-colors"
              >
                Enregistrer
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
              {text || 'Aucun texte'}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
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
              className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10"
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
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
          <ImageIcon className="h-4 w-4 text-slate-600" />
          <span className="text-xs text-slate-600">Aucun visuel</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
        {/* Primary actions */}
        {content.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove?.(content.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-medium hover:bg-green-500/25 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Approuver
            </button>
            <button
              onClick={() => onReject?.(content.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Rejeter
            </button>
          </>
        )}

        {/* Secondary actions */}
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 hover:text-slate-300 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editer
        </button>
        <button
          onClick={() => onRegenerate?.(content.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerer
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 hover:text-slate-300 transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? 'Copie !' : 'Copier'}
        </button>
        {images.length > 0 && (
          <button
            onClick={handleDownloadAssets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 hover:text-slate-300 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Assets
          </button>
        )}
      </div>
    </div>
  )
}
