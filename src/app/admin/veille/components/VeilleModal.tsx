'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Heart,
  MessageCircle,
  Eye,
  Calendar,
  Lightbulb,
  Target,
  MonitorPlay,
} from 'lucide-react'
import type { VeillePost } from './VeilleCard'

const scoreColor = (score: number | null) => {
  if (!score) return 'bg-muted text-muted-foreground'
  if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (score >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}

const verticalLabels: Record<string, string> = {
  livraison_food: 'Livraison food',
  livraison_courses: 'Livraison courses',
  transport: 'Transport',
  services: 'Services',
  immobilier: 'Immobilier',
  vehicules: 'Vehicules',
  super_app: 'Super-app',
  parrainage: 'Parrainage',
  general: 'General',
}

type Props = {
  post: VeillePost | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (postId: string) => void
  onDismiss: (postId: string) => void
}

export function VeilleModal({ post, open, onOpenChange, onSelect, onDismiss }: Props) {
  if (!post) return null

  const engagement = post.engagement || {}
  const analysis = post.ai_analysis || {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{post.advertiser_name || 'Post'}</span>
            <Badge className={`${scoreColor(post.ai_score)} font-bold`}>
              {post.ai_score ?? '?'}/100
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {post.platform?.toUpperCase()} - {post.format} {post.is_ad ? '(Publicite)' : '(Organique)'}
          </DialogDescription>
        </DialogHeader>

        {/* Media */}
        {(post.media_url || post.media_thumbnail_url) && (
          <div className="rounded-lg overflow-hidden bg-muted">
            {post.format === 'video' && post.media_url?.includes('.mp4') ? (
              <video
                src={post.media_url}
                controls
                className="w-full max-h-[400px] object-contain"
                poster={post.media_thumbnail_url}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.media_thumbnail_url || post.media_url}
                alt={post.advertiser_name || 'Post'}
                className="w-full max-h-[400px] object-contain"
              />
            )}
          </div>
        )}

        {/* Text content */}
        {post.text_content && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm whitespace-pre-wrap">{post.text_content}</p>
          </div>
        )}

        {/* Engagement */}
        {(engagement.likes || engagement.comments || engagement.views) && (
          <div className="flex items-center gap-6">
            {engagement.likes != null && (
              <span className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 text-red-500" />
                {engagement.likes.toLocaleString('fr-FR')}
              </span>
            )}
            {engagement.comments != null && (
              <span className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                {engagement.comments.toLocaleString('fr-FR')}
              </span>
            )}
            {engagement.views != null && (
              <span className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-muted-foreground" />
                {engagement.views.toLocaleString('fr-FR')}
              </span>
            )}
          </div>
        )}

        {/* Verticals */}
        {post.vertical_tags && post.vertical_tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.vertical_tags.map((tag: string) => (
              <Badge key={tag} variant="outline">
                {verticalLabels[tag] || tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* AI Analysis */}
        {(analysis.pourquoi_ca_marche || analysis.angle_adaptation || analysis.format_recommande) && (
          <div className="space-y-4">
            <h4 className="font-heading font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Analyse IA
            </h4>

            {analysis.pourquoi_ca_marche && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pourquoi ca marche</p>
                <p className="text-sm">{analysis.pourquoi_ca_marche}</p>
              </div>
            )}

            {analysis.angle_adaptation && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Angle adaptation Cobeone
                </p>
                <p className="text-sm">{analysis.angle_adaptation}</p>
              </div>
            )}

            {analysis.format_recommande && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MonitorPlay className="h-3 w-3" />
                  Format recommande
                </p>
                <Badge variant="secondary">{analysis.format_recommande}</Badge>
              </div>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Collecte: {new Date(post.collected_at).toLocaleDateString('fr-FR')}
          </span>
          {post.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Publication: {new Date(post.published_at).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => { onSelect(post.id); onOpenChange(false) }}
              disabled={post.status === 'selected'}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              {post.status === 'selected' ? 'Selectionne' : 'Selectionner'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => { onDismiss(post.id); onOpenChange(false) }}
              disabled={post.status === 'dismissed'}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Rejeter
            </Button>
          </div>
          {post.original_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(post.original_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir l&apos;original
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
