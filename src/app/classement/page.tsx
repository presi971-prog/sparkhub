import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TierBadge } from '@/components/tier-badge'
import { Trophy, Crown, Truck, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Classement',
  description: 'Découvrez le classement des meilleurs livreurs et professionnels de Guadeloupe.',
}

export default async function ClassementPage() {
  const supabase = await createClient()

  // Fetch user
  const { data: { user } } = await supabase.auth.getUser()
  let userProfile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
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

  // Fetch top professionnels
  const { data: prosData } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, points, rank_number, tiers(name, emoji, display_name)')
    .eq('role', 'professionnel')
    .order('points', { ascending: false })
    .limit(50)

  // Transform data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const livreurs = (livreursData || []).map((l: any) => ({
    ...l,
    tiers: Array.isArray(l.tiers) ? l.tiers[0] : l.tiers,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pros = (prosData || []).map((p: any) => ({
    ...p,
    tiers: Array.isArray(p.tiers) ? p.tiers[0] : p.tiers,
  }))

  const top3Livreurs = livreurs?.slice(0, 3) || []
  const restLivreurs = livreurs?.slice(3) || []
  const top3Pros = pros?.slice(0, 3) || []
  const restPros = pros?.slice(3) || []

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
              Les meilleurs de Guadeloupe
            </h1>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Accumulez des points et grimpez dans le classement pour gagner des réductions exclusives.
            </p>
          </div>

          {/* Tabs for Livreurs / Pros */}
          <Tabs defaultValue="livreurs" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="livreurs" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Livreurs
              </TabsTrigger>
              <TabsTrigger value="pros" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Professionnels
              </TabsTrigger>
            </TabsList>

            {/* Livreurs Tab */}
            <TabsContent value="livreurs">
              {/* Podium Livreurs */}
              <div className="mb-8 sm:mb-10 md:mb-12">
                <h2 className="font-heading text-xl sm:text-2xl font-semibold text-center mb-6 sm:mb-8">
                  <Crown className="h-5 w-5 sm:h-6 sm:w-6 inline-block mr-2 text-yellow-500" />
                  Podium Livreurs
                </h2>
                <Podium top3={top3Livreurs} user={user} emoji="🚚" />
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
                  <LeaderboardList items={restLivreurs} user={user} startRank={4} emoji="🚚" />
                  {restLivreurs.length === 0 && top3Livreurs.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun livreur dans le classement pour le moment.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* How to earn points - Livreurs */}
              <div className="mt-8 sm:mt-10 md:mt-12">
                <h2 className="font-heading text-xl sm:text-2xl font-semibold text-center mb-6 sm:mb-8">
                  Comment gagner des points ?
                </h2>
                <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
                  {[
                    { label: 'Livraison effectuée', points: '+10 pts', icon: '📦' },
                    { label: 'Livraison express', points: '+15 pts', icon: '⚡' },
                    { label: 'Avis 5 étoiles', points: '+20 pts', icon: '⭐' },
                    { label: 'Badge débloqué', points: '+25 pts', icon: '🏅' },
                  ].map((item) => (
                    <Card key={item.label}>
                      <CardContent className="flex items-center gap-3 py-4">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-sm text-primary font-semibold">{item.points}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Professionnels Tab */}
            <TabsContent value="pros">
              {/* Podium Pros */}
              <div className="mb-8 sm:mb-10 md:mb-12">
                <h2 className="font-heading text-xl sm:text-2xl font-semibold text-center mb-6 sm:mb-8">
                  <Crown className="h-5 w-5 sm:h-6 sm:w-6 inline-block mr-2 text-yellow-500" />
                  Podium Professionnels
                </h2>
                <Podium top3={top3Pros} user={user} emoji="🏢" />
              </div>

              {/* Rest of leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle>Classement complet</CardTitle>
                  <CardDescription>
                    Les 50 meilleurs professionnels de la plateforme
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaderboardList items={restPros} user={user} startRank={4} emoji="🏢" />
                  {restPros.length === 0 && top3Pros.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun professionnel dans le classement pour le moment.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* How to earn points - Pros */}
              <div className="mt-8 sm:mt-10 md:mt-12">
                <h2 className="font-heading text-xl sm:text-2xl font-semibold text-center mb-6 sm:mb-8">
                  Comment gagner des points ?
                </h2>
                <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
                  {[
                    { label: 'Mission créée', points: '+10 pts', icon: '📋' },
                    { label: 'Avis laissé', points: '+5 pts', icon: '✍️' },
                    { label: 'Contenu IA créé', points: '+15 pts', icon: '🤖' },
                    { label: 'Badge débloqué', points: '+25 pts', icon: '🏅' },
                  ].map((item) => (
                    <Card key={item.label}>
                      <CardContent className="flex items-center gap-3 py-4">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-sm text-secondary font-semibold">{item.points}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}

// Podium Component
function Podium({ top3, user, emoji }: { top3: any[]; user: any; emoji: string }) {
  if (top3.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Pas encore de participants au podium.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-4">
      {/* 2nd place */}
      {top3[1] && (
        <div className="text-center order-1 sm:order-none">
          <div className="relative mb-2 sm:mb-4">
            <div className="flex h-14 w-14 sm:h-20 sm:w-20 mx-auto items-center justify-center rounded-full bg-gray-100 text-2xl sm:text-4xl border-4 border-gray-400">
              {top3[1].tiers?.emoji || emoji}
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gray-400 text-white font-bold text-sm sm:text-base">
              2
            </div>
          </div>
          <div className="bg-gray-100 rounded-t-lg p-2 sm:p-4 pt-4 sm:pt-8 h-24 sm:h-32">
            <p className="font-semibold truncate max-w-[80px] sm:max-w-[120px] text-sm sm:text-base">{top3[1].full_name}</p>
            {top3[1].tiers && <TierBadge tier={top3[1].tiers.name} size="sm" />}
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{top3[1].points || 0} pts</p>
          </div>
        </div>
      )}

      {/* 1st place */}
      {top3[0] && (
        <div className="text-center -mt-4 sm:-mt-8 order-first sm:order-none">
          <div className="relative mb-2 sm:mb-4">
            <div className="flex h-16 w-16 sm:h-24 sm:w-24 mx-auto items-center justify-center rounded-full bg-yellow-50 text-3xl sm:text-5xl border-4 border-yellow-500">
              {top3[0].tiers?.emoji || emoji}
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-yellow-500 text-white font-bold text-base sm:text-lg">
              <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-t-lg p-2 sm:p-4 pt-4 sm:pt-8 h-28 sm:h-40 border-2 border-yellow-200">
            <p className="font-bold text-sm sm:text-lg truncate max-w-[100px] sm:max-w-[140px]">{top3[0].full_name}</p>
            {top3[0].tiers && <TierBadge tier={top3[0].tiers.name} size="md" />}
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">{top3[0].points || 0} pts</p>
          </div>
        </div>
      )}

      {/* 3rd place */}
      {top3[2] && (
        <div className="text-center order-2 sm:order-none">
          <div className="relative mb-2 sm:mb-4">
            <div className="flex h-14 w-14 sm:h-20 sm:w-20 mx-auto items-center justify-center rounded-full bg-orange-50 text-2xl sm:text-4xl border-4 border-orange-400">
              {top3[2].tiers?.emoji || emoji}
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-orange-400 text-white font-bold text-sm sm:text-base">
              3
            </div>
          </div>
          <div className="bg-orange-50 rounded-t-lg p-2 sm:p-4 pt-4 sm:pt-8 h-20 sm:h-28">
            <p className="font-semibold truncate max-w-[80px] sm:max-w-[120px] text-sm sm:text-base">{top3[2].full_name}</p>
            {top3[2].tiers && <TierBadge tier={top3[2].tiers.name} size="sm" />}
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{top3[2].points || 0} pts</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Leaderboard List Component
function LeaderboardList({ items, user, startRank, emoji }: { items: any[]; user: any; startRank: number; emoji: string }) {
  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const rank = startRank + index
        const isCurrentUser = user && item.id === user.id

        return (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-4 rounded-lg p-3 transition-colors',
              isCurrentUser ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted'
            )}
          >
            <div className="w-8 text-center font-bold text-muted-foreground">
              {rank}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl">
              {item.tiers?.emoji || emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{item.full_name}</span>
                {item.tiers && (
                  <TierBadge tier={item.tiers.name} size="sm" showLabel={false} />
                )}
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs">
                    Vous
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{item.points || 0} pts</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
