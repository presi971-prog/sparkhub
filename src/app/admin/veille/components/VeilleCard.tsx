'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Play,
  Image as ImageIcon,
  Layers,
  Facebook,
  Instagram,
  Eye,
  MessageCircle,
  Heart,
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VeillePost = any

const platformIcons: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-3.5 w-3.5" />,
  instagram: <Instagram className="h-3.5 w-3.5" />,
  tiktok: <span className="text-xs font-bold">TT</span>,
  linkedin: <span className="text-xs font-bold">in</span>,
}

const formatIcons: Record<string, React.ReactNode> = {
  video: <Play className="h-3 w-3" />,
  image: <ImageIcon className="h-3 w-3" />,
  carousel: <Layers className="h-3 w-3" />,
  text: <span className="text-xs">T</span>,
}

const scoreColor = (score: number | null) => {
  if (!score) return 'bg-muted text-muted-foreground'
  if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (score >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}

const verticalLabels: Record<string, string> = {
  livraison_food: 'Food',
  livraison_courses: 'Courses',
  transport: 'Transport',
  services: 'Services',
  immobilier: 'Immo',
  vehicules: 'Vehicules',
  super_app: 'Super-app',
  parrainage: 'Parrainage',
  general: 'General',
}

type Props = {
  post: VeillePost
  onSelect: (postId: string) => void
  onDismiss: (postId: string) => void
  onClick: (post: VeillePost) => void
}

export function VeilleCard({ post, onSelect, onDismiss, onClick }: Props) {
  const engagement = post.engagement || {}
  const analysis = post.ai_analysis || {}

  return (
    <Card
      className="group relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
      onClick={() => onClick(post)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {post.media_thumbnail_url || post.media_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.media_thumbnail_url || post.media_url}
            alt={post.advertiser_name || 'Post'}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 opacity-30" />
          </div>
        )}

        {/* Score badge */}
        <div className="absolute top-2 right-2">
          <Badge className={`${scoreColor(post.ai_score)} font-bold text-sm`}>
            {post.ai_score ?? '?'}
          </Badge>
        </div>

        {/* Format + Platform */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge variant="secondary" className="gap-1 text-xs backdrop-blur-sm bg-background/80">
            {platformIcons[post.platform] || post.platform}
          </Badge>
          {post.format && (
            <Badge variant="secondary" className="gap-1 text-xs backdrop-blur-sm bg-background/80">
              {formatIcons[post.format] || post.format}
            </Badge>
          )}
          {post.is_ad && (
            <Badge variant="secondary" className="text-xs backdrop-blur-sm bg-background/80">
              Ad
            </Badge>
          )}
        </div>

        {/* Status overlay */}
        {post.status === 'selected' && (
          <div className="absolute inset-0 bg-green-500/10 border-2 border-green-500 pointer-events-none" />
        )}
        {post.status === 'dismissed' && (
          <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Advertiser */}
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm truncate">
            {post.advertiser_name || 'Inconnu'}
          </p>
        </div>

        {/* Text preview */}
        {post.text_content && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {post.text_content}
          </p>
        )}

        {/* Engagement */}
        {(engagement.likes || engagement.comments || engagement.views) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {engagement.likes != null && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {formatNumber(engagement.likes)}
              </span>
            )}
            {engagement.comments != null && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {formatNumber(engagement.comments)}
              </span>
            )}
            {engagement.views != null && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatNumber(engagement.views)}
              </span>
            )}
          </div>
        )}

        {/* Verticals */}
        {post.vertical_tags && post.vertical_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.vertical_tags.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {verticalLabels[tag] || tag}
              </Badge>
            ))}
          </div>
        )}

        {/* AI insight preview */}
        {analysis.pourquoi_ca_marche && (
          <p className="text-[11px] text-muted-foreground italic line-clamp-1">
            {analysis.pourquoi_ca_marche}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={(e) => { e.stopPropagation(); onSelect(post.id) }}
              disabled={post.status === 'selected'}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={(e) => { e.stopPropagation(); onDismiss(post.id) }}
              disabled={post.status === 'dismissed'}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
          </div>
          {post.original_url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={(e) => {
                e.stopPropagation()
                window.open(post.original_url, '_blank')
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}
