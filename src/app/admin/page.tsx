import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Truck, Store, FileText, CreditCard, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Administration',
  description: 'Tableau de bord administrateur',
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch stats
  const [
    { count: totalProfiles },
    { count: totalLivreurs },
    { count: totalPros },
    { count: totalRessources },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('livreurs').select('*', { count: 'exact', head: true }),
    supabase.from('professionnels').select('*', { count: 'exact', head: true }),
    supabase.from('ressources').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    {
      title: 'Utilisateurs',
      value: totalProfiles || 0,
      description: 'Total inscrits',
      icon: Users,
      href: '/admin/utilisateurs',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Livreurs',
      value: totalLivreurs || 0,
      description: 'Livreurs inscrits',
      icon: Truck,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Professionnels',
      value: totalPros || 0,
      description: 'Pros inscrits',
      icon: Store,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Ressources',
      value: totalRessources || 0,
      description: 'Outils disponibles',
      icon: FileText,
      href: '/admin/ressources',
      color: 'text-orange-600 bg-orange-100',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Dashboard Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Vue d'ensemble de la plateforme Cobeone Pro
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const content = (
            <Card className={stat.href ? 'hover:border-primary transition-colors cursor-pointer' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )

          if (stat.href) {
            return (
              <Link key={stat.title} href={stat.href}>
                {content}
              </Link>
            )
          }
          return <div key={stat.title}>{content}</div>
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-heading text-xl font-bold mb-4">Actions rapides</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/ressources">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                  Gérer les ressources
                </CardTitle>
                <CardDescription>
                  Ajouter, modifier ou supprimer des outils IA
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/utilisateurs">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Gérer les utilisateurs
                </CardTitle>
                <CardDescription>
                  Voir et gérer les comptes utilisateurs
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-400" />
                Transactions
              </CardTitle>
              <CardDescription>
                Bientôt disponible
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}
