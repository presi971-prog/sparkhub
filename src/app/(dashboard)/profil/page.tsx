import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TierBadge } from '@/components/tier-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Mail, Phone, MapPin, Calendar, Award } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const metadata: Metadata = {
  title: 'Mon Profil',
  description: 'Gérez votre profil Cobeone Pro',
}

export default async function ProfilPage() {
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

  // Fetch livreur info if applicable
  const { data: livreurData } = await supabase
    .from('livreurs')
    .select('*, zones:zones_livraison(commune:communes(name))')
    .eq('profile_id', user.id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const livreur = livreurData as any

  // Fetch earned badges
  const { data: earnedBadgesData } = await supabase
    .from('profile_badges')
    .select('*, badge:badges(*)')
    .eq('profile_id', user.id)
    .order('earned_at', { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const earnedBadges = earnedBadgesData as any[]

  // Fetch all badges
  const { data: allBadgesData } = await supabase
    .from('badges')
    .select('*')
    .order('category')
    .order('points_reward')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allBadges = allBadgesData as any[]

  if (!profile) return null

  const vehicleLabels: Record<string, string> = {
    velo: 'Vélo',
    velo_cargo: 'Vélo Cargo',
    scooter: 'Scooter',
    moto: 'Moto',
    voiture: 'Voiture',
    utilitaire: 'Utilitaire',
  }

  const earnedBadgeIds = new Set(earnedBadges?.map(eb => eb.badge_id) || [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Mon Profil</h1>
        <p className="mt-2 text-muted-foreground">
          Gérez vos informations personnelles et suivez vos badges.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {profile.tiers && <TierBadge tier={profile.tiers.name} />}
                  <Badge variant="outline">
                    {profile.role === 'livreur' ? 'Livreur' : 'Professionnel'}
                  </Badge>
                  {profile.rank_number && (
                    <span className="text-sm text-muted-foreground">
                      Inscrit #{profile.rank_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{profile.email}</p>
                </div>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p>{profile.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Membre depuis</p>
                  <p>{format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Award className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p>{profile.points} points</p>
                </div>
              </div>
            </div>

            {/* Livreur specific info */}
            {livreur && (
              <div className="pt-4 border-t space-y-4">
                <h3 className="font-semibold">Informations livreur</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Véhicule</p>
                    <p>{vehicleLabels[livreur.vehicle_type] || livreur.vehicle_type}</p>
                  </div>
                  {livreur.vehicle_brand && (
                    <div>
                      <p className="text-sm text-muted-foreground">Marque / Modèle</p>
                      <p>{livreur.vehicle_brand} {livreur.vehicle_model}</p>
                    </div>
                  )}
                </div>
                {livreur.zones && livreur.zones.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Zones de livraison</p>
                    <div className="flex flex-wrap gap-2">
                      {livreur.zones.map((zone: { commune: { name: string } }, index: number) => (
                        <Badge key={index} variant="secondary">
                          <MapPin className="h-3 w-3 mr-1" />
                          {zone.commune?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Points totaux</span>
              <span className="font-bold">{profile.points}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Badges obtenus</span>
              <span className="font-bold">{earnedBadges?.length || 0}</span>
            </div>
            {profile.tiers && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Réduction tier</span>
                <span className="font-bold text-primary">-{profile.tiers.discount_percent}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badges
          </CardTitle>
          <CardDescription>
            {earnedBadges?.length || 0} sur {allBadges?.length || 0} badges débloqués
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {allBadges?.map((badge) => {
              const isEarned = earnedBadgeIds.has(badge.id)
              return (
                <div
                  key={badge.id}
                  className={`rounded-lg border p-4 text-center transition-colors ${
                    isEarned ? 'bg-primary/5 border-primary/20' : 'opacity-50'
                  }`}
                >
                  <span className={`text-3xl ${isEarned ? '' : 'grayscale'}`}>{badge.icon}</span>
                  <h4 className="font-medium mt-2">{badge.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                  <Badge variant="secondary" className="mt-2">
                    +{badge.points_reward} pts
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
