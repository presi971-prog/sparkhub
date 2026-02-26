'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, RefreshCw, Inbox, Star } from 'lucide-react'
import { toast } from 'sonner'
import { VeilleCard } from './VeilleCard'
import { VeilleModal } from './VeilleModal'
import { VeilleFilters, type VeilleFiltersState } from './VeilleFilters'
import type { VeillePost } from './VeilleCard'

type ApiResponse = {
  posts: VeillePost[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function VeilleDashboard() {
  const [posts, setPosts] = useState<VeillePost[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedPost, setSelectedPost] = useState<VeillePost | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = useState<string>('discover')

  const [filters, setFilters] = useState<VeilleFiltersState>({
    platform: 'all',
    vertical: 'all',
    format: 'all',
    status: 'new',
    minScore: 0,
    sort: 'ai_score',
    order: 'desc',
  })

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        platform: filters.platform,
        vertical: filters.vertical,
        format: filters.format,
        status: tab === 'selections' ? 'selected' : filters.status,
        minScore: String(filters.minScore),
        sort: filters.sort,
        order: filters.order,
        page: String(page),
        limit: '24',
      })

      const res = await fetch(`/api/veille?${params}`)
      if (!res.ok) throw new Error('Erreur chargement')

      const data: ApiResponse = await res.json()
      setPosts(data.posts)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      toast.error('Erreur lors du chargement des posts')
    } finally {
      setLoading(false)
    }
  }, [filters, page, tab])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filters, tab])

  const handleAction = async (postId: string, action: 'select' | 'dismiss') => {
    try {
      const res = await fetch('/api/veille/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action }),
      })

      if (!res.ok) throw new Error('Erreur')

      toast.success(action === 'select' ? 'Post selectionne' : 'Post rejete')

      // Update local state
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, status: action === 'select' ? 'selected' : 'dismissed' }
            : p
        )
      )
    } catch {
      toast.error('Erreur lors de l\'action')
    }
  }

  const handleCardClick = (post: VeillePost) => {
    setSelectedPost(post)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total posts</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Score moyen</CardDescription>
            <CardTitle className="text-3xl">
              {posts.length > 0
                ? Math.round(posts.reduce((sum, p) => sum + (p.ai_score || 0), 0) / posts.filter(p => p.ai_score).length) || '-'
                : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Selectionnes</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {posts.filter(p => p.status === 'selected').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A traiter</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {posts.filter(p => p.status === 'new').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="discover" className="gap-2">
              <Inbox className="h-4 w-4" />
              Decouvrir
            </TabsTrigger>
            <TabsTrigger value="selections" className="gap-2">
              <Star className="h-4 w-4" />
              Mes selections
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={fetchPosts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        <TabsContent value="discover" className="space-y-4 mt-4">
          <VeilleFilters filters={filters} onChange={setFilters} total={total} />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Aucun post pour le moment</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Les workflows n8n collecteront les posts automatiquement.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {posts.map(post => (
                  <VeilleCard
                    key={post.id}
                    post={post}
                    onSelect={(id) => handleAction(id, 'select')}
                    onDismiss={(id) => handleAction(id, 'dismiss')}
                    onClick={handleCardClick}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Precedent
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="selections" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">{total} selection{total > 1 ? 's' : ''}</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Star className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Aucune selection</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Selectionnez des posts depuis l&apos;onglet Decouvrir.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {posts.map(post => (
                <VeilleCard
                  key={post.id}
                  post={post}
                  onSelect={(id) => handleAction(id, 'select')}
                  onDismiss={(id) => handleAction(id, 'dismiss')}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <VeilleModal
        post={selectedPost}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={(id) => handleAction(id, 'select')}
        onDismiss={(id) => handleAction(id, 'dismiss')}
      />
    </div>
  )
}
