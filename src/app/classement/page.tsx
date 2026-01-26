import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TierBadge } from '@/components/tier-badge'
import { Trophy, Medal, Star, TrendingUp, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Classement',
  description: 'Découvrez le classement des meilleurs livreurs de Guadeloupe.',
}

export default async function ClassementPage() {
  const supabase = await createClient()

  // Fetch user
  const { data: { user } } = await supabase.auth.getUser()
  let userProfile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', user.id)
      .single()
    userProfile = data
  }

  // Fetch top livreurs
  const { data: livreursData } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, points, rank_number, tiers(name, emoji, display_name)')
    .eq('role', 'livreur')
    .order('points', { ascending: false })
    .limit(50)

  // Transform data (Supabase returns arrays for joins)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const livreurs = (livreursData || []).map((l: any) => ({
    ...l,
    tiers: Array.isArray(l.tiers) ? l.tiers[0] : l.tiers,
  }))

  // Get current user's rank if they're a livreur
  let currentUserRank = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, points, rank_number, tiers(name, emoji)')
      .eq('id', user.id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userData = data as any
    currentUserRank = userData ? {
      ...userData,
      tiers: Array.isArray(userData.tiers) ? userData.tiers[0] : userData.tiers,
    } : null
  }

  const top3 = livreurs?.slice(0, 3) || []
  const rest = livreurs?.slice(3) || []

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={userProfile} />
      <main className="flex-1 py-8 sm:py-10 md:py-12">
        <div className="container">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <Badge variant="secondary" className="mb-4">
              <Trophy className="h-3 w-3 mr-1" />
              Classement
            </Badge>
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold">
              Les meilleurs livreurs de Guadeloupe
            </h1>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Accumulez des points en effectuant des livraisons et en recevant des avis positifs
              pour grimper dans le classement et gagner des réductions.
            </p>
          </div>

          {/* Current user rank */}
          {currentUserRank && currentUserRank.rank_number && (
            <Card className="mb-8 bg-primary/5 border-primary/20">
              <CardContent className="flex items-center justify-between py-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                    {currentUserRank.tiers?.emoji || '🚚'}
                  </div>
                  <div>
                    <p className="font-semibold">Votre position</p>
                    <p className="text-sm text-muted-foreground">
                      {currentUserRank.full_name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">#{currentUserRank.rank_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentUserRank.points} points
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Podium */}
          <div className="mb-8 sm:mb-10 md:mb-12">
            <h2 className="font-heading text-xl sm:text-2xl font-semibold text-center mb-6 sm:mb-8">
              <Crown className="h-5 w-5 sm:h-6 sm:w-6 inline-block mr-2 text-yellow-500" />
              Podium
            </h2>
            <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-4">
              {/* 2nd place */}
              {top3[1] && (
                <div className="text-center order-1 sm:order-none">
                  <div className="relative mb-2 sm:mb-4">
                    <div className="flex h-14 w-14 sm:h-20 sm:w-20 mx-auto items-center justify-center rounded-full bg-gray-100 text-2xl sm:text-4xl border-4 border-gray-400">
                      {top3[1].tiers?.emoji || '🚚'}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gray-400 text-white font-bold text-sm sm:text-base">
                      2
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-t-lg p-2 sm:p-4 pt-4 sm:pt-8 h-24 sm:h-32">
                    <p className="font-semibold truncate max-w-[80px] sm:max-w-[120px] text-sm sm:text-base">{top3[1].full_name}</p>
                    {top3[1].tiers && <TierBadge tier={top3[1].tiers.name} size="sm" />}
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{top3[1].points} pts</p>
                  </div>
                </div>
              )}

              {/* 1st place */}
              {top3[0] && (
                <div className="text-center -mt-4 sm:-mt-8 order-first sm:order-none">
                  <div className="relative mb-2 sm:mb-4">
                    <div className="flex h-16 w-16 sm:h-24 sm:w-24 mx-auto items-center justify-center rounded-full bg-yellow-50 text-3xl sm:text-5xl border-4 border-yellow-500">
                      {top3[0].tiers?.emoji || '🚚'}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-yellow-500 text-white font-bold text-base sm:text-lg">
                      <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-t-lg p-2 sm:p-4 pt-4 sm:pt-8 h-28 sm:h-40 border-2 border-yellow-200">
                    <p className="font-bold text-sm sm:text-lg truncate max-w-[100px] sm:max-w-[140px]">{top3[0].full_name}</p>
                    {top3[0].tiers && <TierBadge tier={top3[0].tiers.name} size="md" />}
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">{top3[0].points} pts</p>
                  </div>
                </div>
              )}

              {/* 3rd place */}
              {top3[2] && (
                <div className="text-center order-2 sm:order-none">
                  <div className="relative mb-2 sm:mb-4">
                    <div className="flex h-14 w-14 sm:h-20 sm:w-20 mx-auto items-center justify-center rounded-full bg-orange-50 text-2xl sm:text-4xl border-4 border-orange-400">
                      {top3[2].tiers?.emoji || '🚚'}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-orange-400 text-white font-bold text-sm sm:text-base">
                      3
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-t-lg p-2 sm:p-4 pt-4 sm:pt-8 h-20 sm:h-28">
                    <p className="font-semibold truncate max-w-[80px] sm:max-w-[120px] text-sm sm:text-base">{top3[2].full_name}</p>
                    {top3[2].tiers && <TierBadge tier={top3[2].tiers.name} size="sm" />}
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{top3[2].points} pts</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rest of leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Classement complet</CardTitle>
              <CardDescription>
                Les 50 meilleurs livreurs de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rest.map((livreur, index) => {
                  const rank = index + 4 // Start from 4th
                  const isCurrentUser = user && livreur.id === user.id

                  return (
                    <div
                      key={livreur.id}
                      className={cn(
                        'flex items-center gap-4 rounded-lg p-3 transition-colors',
                        isCurrentUser ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted'
                      )}
                    >
                      <div className="w-8 text-center font-bold text-muted-foreground">
                        {rank}
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl">
                        {livreur.tiers?.emoji || '🚚'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{livreur.full_name}</span>
                          {livreur.tiers && (
                            <TierBadge tier={livreur.tiers.name} size="sm" showLabel={false} />
                          )}
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              Vous
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{livreur.points} pts</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {rest.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Aucun livreur dans le classement pour le moment.
                </p>
              )}
            </CardContent>
          </Card>

          {/* How to earn points */}
          <div className="mt-8 sm:mt-10 md:mt-12">
            <h2 className="font-heading text-xl sm:text-2xl font-semibold text-center mb-6 sm:mb-8">
              Comment gagner des points ?
            </h2>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
              {[
                { label: 'Livraison standard', points: '+10 pts', icon: '📦' },
                { label: 'Livraison express', points: '+15 pts', icon: '⚡' },
                { label: 'Avis 5 étoiles', points: '+20 pts', icon: '⭐' },
                { label: 'Badge débloqué', points: '+25 pts', icon: '🏅' },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-primary font-semibold">{item.points}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
