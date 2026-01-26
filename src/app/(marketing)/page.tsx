import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TierCounter } from '@/components/tier-counter'
import {
  MapPin,
  Users,
  CreditCard,
  Wrench,
  Trophy,
  Star,
  ArrowRight,
  CheckCircle2,
  Bike,
  Car,
  Truck
} from 'lucide-react'

const stats = [
  { label: 'Livreurs actifs', value: '150+', icon: Users },
  { label: 'Communes couvertes', value: '32', icon: MapPin },
  { label: 'Outils disponibles', value: '10+', icon: Wrench },
  { label: 'Taux de satisfaction', value: '98%', icon: Star },
]

const features = [
  {
    title: 'Carte Interactive',
    description: 'Soyez visible sur la carte de Guadeloupe. Les professionnels vous trouvent en un clic.',
    icon: MapPin,
    href: '/carte',
  },
  {
    title: 'Outils IA',
    description: 'Community Manager, création de visuels, montage vidéo... Ce qui coûte 300€/mois ailleurs, moins de 50€ ici.',
    icon: Wrench,
    href: '/ressources',
  },
  {
    title: 'Gamification',
    description: 'Gagnez des points, débloquez des badges et grimpez dans le classement pour plus de visibilité.',
    icon: Trophy,
    href: '/classement',
  },
  {
    title: 'Tarifs Avantageux',
    description: 'Les premiers inscrits bénéficient de réductions permanentes. Places limitées !',
    icon: CreditCard,
    href: '/tarifs',
  },
]

const vehicleTypes = [
  { name: 'Vélo', icon: Bike },
  { name: 'Scooter', icon: Bike },
  { name: 'Voiture', icon: Car },
  { name: 'Utilitaire', icon: Truck },
]

const testimonials = [
  {
    name: 'Jean-Pierre M.',
    role: 'Livreur Platine',
    content: 'Grâce à Cobeone Pro, j\'ai triplé mes demandes en 2 mois. Les outils IA m\'ont permis de créer une vraie présence en ligne.',
    avatar: '👨🏾',
    tier: 'platine',
  },
  {
    name: 'Marie-Claire L.',
    role: 'Livreuse Or',
    content: 'La carte interactive est géniale. Les clients me trouvent facilement et voient mes avis. Je recommande !',
    avatar: '👩🏽',
    tier: 'or',
  },
  {
    name: 'Restaurant Le Créole',
    role: 'Professionnel',
    content: 'On trouve enfin des livreurs fiables et vérifiés en Guadeloupe. Un gain de temps énorme pour notre restaurant.',
    avatar: '🍽️',
    tier: 'standard',
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-12 sm:py-16 md:py-24 lg:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge urgence */}
            <div className="mb-6 flex justify-center">
              <TierCounter />
            </div>

            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              La plateforme des{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                livreurs
              </span>{' '}
              de Guadeloupe
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Outils IA, visibilité maximale et réseau professionnel.
              Ce qui coûte 300€/mois avec un prestataire, moins de 50€ avec nous.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild className="gap-2">
                <Link href="/inscription/livreur">
                  Devenir Livreur
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/inscription/professionnel">
                  Je suis Professionnel
                </Link>
              </Button>
            </div>

            {/* Véhicules */}
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              {vehicleTypes.map((vehicle) => (
                <div
                  key={vehicle.name}
                  className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm"
                >
                  <vehicle.icon className="h-4 w-4 text-primary" />
                  {vehicle.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-1/2 left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 blur-3xl" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30 py-12">
        <div className="container">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-24 lg:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold md:text-4xl">
              Tout ce qu'il faut pour réussir
            </h2>
            <p className="mt-4 text-muted-foreground">
              Une plateforme complète pour développer votre activité de livraison en Guadeloupe.
            </p>
          </div>

          <div className="mt-8 sm:mt-12 md:mt-16 grid gap-4 sm:gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                  <Link
                    href={feature.href}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    En savoir plus
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tier Benefits Preview */}
      <section className="bg-muted/30 py-12 sm:py-16 md:py-24 lg:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Places Limitées
            </Badge>
            <h2 className="font-heading text-3xl font-bold md:text-4xl">
              Plus vous vous inscrivez tôt, plus vous économisez
            </h2>
            <p className="mt-4 text-muted-foreground">
              Les 100 premiers inscrits bénéficient de réductions permanentes sur tous les outils.
            </p>
          </div>

          <div className="mt-8 sm:mt-12 md:mt-16 grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
            {[
              { tier: 'Platine', emoji: '🏆', places: '1-10', reduction: '50%', color: 'from-cyan-500/20 to-blue-500/20 border-cyan-400' },
              { tier: 'Or', emoji: '🥇', places: '11-30', reduction: '25%', color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500' },
              { tier: 'Argent', emoji: '🥈', places: '31-60', reduction: '15%', color: 'from-gray-400/20 to-gray-500/20 border-gray-400' },
              { tier: 'Bronze', emoji: '🥉', places: '61-100', reduction: '10%', color: 'from-orange-600/20 to-orange-700/20 border-orange-600' },
            ].map((item) => (
              <Card key={item.tier} className={`bg-gradient-to-br ${item.color} border-2`}>
                <CardHeader className="text-center p-3 sm:p-6">
                  <span className="text-2xl sm:text-4xl">{item.emoji}</span>
                  <CardTitle>{item.tier}</CardTitle>
                  <CardDescription>Places {item.places}</CardDescription>
                </CardHeader>
                <CardContent className="text-center p-3 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-xl sm:text-3xl font-bold text-primary">{item.reduction}</p>
                  <p className="text-sm text-muted-foreground">de réduction</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button size="lg" asChild>
              <Link href="/tarifs">
                Voir tous les avantages
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 md:py-24 lg:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold md:text-4xl">
              Ils nous font confiance
            </h2>
            <p className="mt-4 text-muted-foreground">
              Découvrez les témoignages de nos membres.
            </p>
          </div>

          <div className="mt-8 sm:mt-12 md:mt-16 grid gap-4 sm:gap-6 md:gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="relative">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-base">{testimonial.name}</CardTitle>
                      <CardDescription>{testimonial.role}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">"{testimonial.content}"</p>
                </CardContent>
                <div className="absolute right-4 top-4 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-primary py-12 sm:py-16 md:py-20 text-primary-foreground">
        <div className="container relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold md:text-4xl">
              Prêt à développer votre activité ?
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              Rejoignez les premiers livreurs de Guadeloupe sur Cobeone Pro et bénéficiez d'avantages exclusifs.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/inscription/livreur">
                  S'inscrire gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link href="/carte">
                  Voir la carte
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Inscription gratuite
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                7 jours d'essai
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Sans engagement
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -bottom-1/2 left-1/4 h-[600px] w-[600px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -top-1/2 right-1/4 h-[600px] w-[600px] rounded-full bg-white/5 blur-3xl" />
        </div>
      </section>
    </div>
  )
}
