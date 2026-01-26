import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TierBadge } from '@/components/tier-badge'
import { Users, Truck, Store, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Gestion des Utilisateurs',
  description: 'Gérez les utilisateurs de la plateforme',
}

export default async function AdminUtilisateursPage() {
  const supabase = await createClient()

  // Fetch all profiles with their tier
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, tiers(*)')
    .order('created_at', { ascending: false })

  // Stats
  const totalUsers = profiles?.length || 0
  const livreurs = profiles?.filter(p => p.role === 'livreur').length || 0
  const pros = profiles?.filter(p => p.role === 'professionnel').length || 0
  const admins = profiles?.filter(p => p.role === 'admin').length || 0

  const roleIcons: Record<string, React.ElementType> = {
    livreur: Truck,
    professionnel: Store,
    admin: Shield,
  }

  const roleColors: Record<string, string> = {
    livreur: 'bg-green-100 text-green-800',
    professionnel: 'bg-purple-100 text-purple-800',
    admin: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Utilisateurs</h1>
        <p className="mt-2 text-muted-foreground">
          Gérez les comptes utilisateurs de la plateforme.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl">{totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Livreurs</CardDescription>
            <CardTitle className="text-3xl text-green-600">{livreurs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Professionnels</CardDescription>
            <CardTitle className="text-3xl text-purple-600">{pros}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{admins}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>
            {totalUsers} utilisateur{totalUsers > 1 ? 's' : ''} inscrit{totalUsers > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Rang</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles && profiles.length > 0 ? (
                profiles.map((profile) => {
                  const RoleIcon = roleIcons[profile.role] || Users
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {profile.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-medium">{profile.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {profile.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[profile.role] || 'bg-gray-100 text-gray-800'}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {profile.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {profile.tiers ? (
                          <TierBadge tier={profile.tiers.name} size="sm" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {profile.rank_number ? (
                          <span className="font-mono">#{profile.rank_number}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{profile.points}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
