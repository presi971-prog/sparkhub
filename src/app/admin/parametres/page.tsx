import { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Bell, Shield, Palette, Globe, CreditCard } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Paramètres',
  description: 'Paramètres de la plateforme SparkHub',
}

export default function ParametresPage() {
  const settingsSections = [
    {
      title: 'Général',
      description: 'Paramètres généraux de la plateforme',
      icon: Settings,
      status: 'available',
      items: ['Nom de la plateforme', 'Logo', 'Description'],
    },
    {
      title: 'Notifications',
      description: 'Gérer les emails et notifications',
      icon: Bell,
      status: 'coming',
      items: ['Emails transactionnels', 'Notifications push', 'Rappels'],
    },
    {
      title: 'Sécurité',
      description: 'Paramètres de sécurité et accès',
      icon: Shield,
      status: 'coming',
      items: ['Authentification', 'Rôles et permissions', 'Logs'],
    },
    {
      title: 'Apparence',
      description: 'Personnaliser le thème et les couleurs',
      icon: Palette,
      status: 'coming',
      items: ['Thème', 'Couleurs', 'Polices'],
    },
    {
      title: 'SEO',
      description: 'Optimisation pour les moteurs de recherche',
      icon: Globe,
      status: 'coming',
      items: ['Métadonnées', 'Sitemap', 'Robots.txt'],
    },
    {
      title: 'Paiements',
      description: 'Configuration des paiements et crédits',
      icon: CreditCard,
      status: 'coming',
      items: ['Stripe', 'Tarifs', 'Factures'],
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Paramètres</h1>
        <p className="mt-2 text-muted-foreground">
          Configurez les paramètres de la plateforme SparkHub
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => (
          <Card
            key={section.title}
            className={section.status === 'coming' ? 'opacity-60' : 'hover:border-primary transition-colors cursor-pointer'}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
                {section.status === 'coming' && (
                  <Badge variant="secondary">Bientôt</Badge>
                )}
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                {section.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
