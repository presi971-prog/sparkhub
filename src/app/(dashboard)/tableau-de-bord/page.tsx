import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TierBadge } from '@/components/tier-badge'
import { getReputationLevel, REPUTATION_LEVELS } from '@/config/tiers'
import {
  CreditCard,
  MapPin,
  Trophy,
  Star,
  Wrench,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tableau de bord',
  description: 'Votre espace membre Cobeone Pro',
}

export default async function TableauDeBordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch profile with tier
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*, tiers(*)')
    .eq('id', user.id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any

  // Fetch credits (new system: subscription + purchased)
  const { data: creditsData } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', user.id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userCredits = creditsData as any
  const totalCredits = (userCredits?.subscription_credits || 0) + (userCredits?.purchased_credits || 0)

  // Fetch badges count
  const { count: badgesCount } = await supabase
    .from('profile_badges')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)

  // Fetch total badges
  const { count: totalBadges } = await supabase
    .from('badges')
    .select('*', { count: 'exact', head: true })

  if (!profile) return null

  const reputationLevel = getReputationLevel(profile.points)
  const nextLevel = Object.values(REPUTATION_LEVELS).find(l => l.min > profile.points)
  const progressToNext = nextLevel
    ? ((profile.points - reputationLevel.min) / (nextLevel.min - reputationLevel.min)) * 100
    : 100

  const stats = [
    {
      label: 'Crédits disponibles',
      value: totalCredits,
      icon: CreditCard,
      href: '/credits',
      color: 'text-green-600',
    },
    {
      label: 'Points accumulés',
      value: profile.points,
      icon: TrendingUp,
      href: '/classement',
      color: 'text-primary',
    },
    {
      label: 'Badges obtenus',
      value: `${badgesCount || 0}/${totalBadges || 0}`,
      icon: Award,
      href: '/profil',
      color: 'text-yellow-600',
    },
    {
      label: 'Classement',
      value: profile.rank_number ? `#${profile.rank_number}` : '-',
      icon: Trophy,
      href: '/classement',
      color: 'text-purple-600',
    },
  ]

  const quickActions = [
    {
      title: 'Voir la carte',
      description: 'Consultez les livreurs disponibles',
      icon: MapPin,
      href: '/carte',
    },
    {
      title: 'Accéder aux outils',
      description: 'Utilisez nos outils IA',
      icon: Wrench,
      href: '/outils',
    },
    {
      title: 'Classement',
      description: 'Voir le classement des livreurs',
      icon: Trophy,
      href: '/classement',
    },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold">
          Bienvenue, {profile.full_name.split(' ')[0]} !
        </h1>
        <p className="mt-2 text-muted-foreground">
          Voici un résumé de votre activité sur Cobeone Pro.
        </p>
      </div>

      {/* Tier Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>Votre tier</CardDescription>
              <CardTitle className="flex items-center gap-3 mt-1">
                {profile.tiers && (
                  <TierBadge tier={profile.tiers.name} size="lg" />
                )}
                {profile.rank_number && (
                  <span className="text-muted-foreground">
                    Inscrit #{profile.rank_number}
                  </span>
                )}
              </CardTitle>
            </div>
            {profile.tiers && (
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {profile.tiers.monthly_credits}
                </p>
                <p className="text-sm text-muted-foreground">crédits/mois</p>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:border-primary/50 transition-colors">
            <Link href={stat.href}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {/* Reputation Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            {reputationLevel.emoji} Niveau {reputationLevel.name}
          </CardTitle>
          <CardDescription>
            {reputationLevel.searchBoost > 0
              ? `Badge "${reputationLevel.badge}" et +${reputationLevel.searchBoost}% de visibilité dans les recherches`
              : 'Accumulez des points pour gagner en visibilité'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{profile.points} points</span>
              {nextLevel && <span>{nextLevel.min} points</span>}
            </div>
            <Progress value={progressToNext} />
            {nextLevel && (
              <p className="text-sm text-muted-foreground">
                Plus que {nextLevel.min - profile.points} points pour le niveau {nextLevel.name} (+{nextLevel.searchBoost}% visibilité)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="font-heading text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Actions rapides</h2>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:border-primary/50 transition-colors">
              <Link href={action.href}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{action.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {action.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card className="bg-secondary/10 border-secondary/20">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 sm:py-6">
          <div>
            <h3 className="font-semibold">Besoin de crédits ?</h3>
            <p className="text-sm text-muted-foreground">
              Achetez des crédits pour utiliser les outils de la plateforme.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/credits">
              Acheter des crédits
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
