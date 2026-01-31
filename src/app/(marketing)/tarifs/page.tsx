import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TierCounter } from '@/components/tier-counter'
import { PricingCards, CreditPackCards } from '@/components/pricing-cards'
import { TOOLS_CONFIG } from '@/config/tiers'
import { ArrowRight, HelpCircle, Zap, Crown, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Tarifs',
  description: 'Découvrez nos formules d\'abonnement et les avantages fondateurs.',
}

const founderTiers = [
  { name: 'Platine', emoji: '🏆', places: '1-10', multiplier: 'x2', color: 'text-cyan-400' },
  { name: 'Or', emoji: '🥇', places: '11-30', multiplier: 'x1.43', color: 'text-yellow-500' },
  { name: 'Argent', emoji: '🥈', places: '31-60', multiplier: 'x1.25', color: 'text-gray-400' },
  { name: 'Bronze', emoji: '🥉', places: '61-100', multiplier: 'x1.10', color: 'text-orange-600' },
]

const faqs = [
  {
    question: 'Qu\'est-ce qu\'un fondateur ?',
    answer: 'Les 100 premiers livreurs et 100 premiers professionnels inscrits obtiennent le statut de fondateur. Pendant 6 mois, ils reçoivent plus de crédits pour le même prix d\'abonnement. Après 6 mois, leur statut évolue selon leur activité.',
  },
  {
    question: 'À quoi servent les crédits ?',
    answer: 'Les crédits vous permettent d\'utiliser nos outils IA : génération de posts (2 crédits), création de photos (3-10 crédits), montage de vidéos (5-100 crédits selon la qualité).',
  },
  {
    question: 'Puis-je acheter des crédits sans abonnement ?',
    answer: 'Oui ! Vous pouvez utiliser SparkHub gratuitement avec votre numéro Cobeone et acheter des crédits à la carte quand vous en avez besoin.',
  },
  {
    question: 'Les crédits s\'accumulent-ils ?',
    answer: 'Les crédits de votre abonnement sont remis à zéro chaque mois. Mais les crédits achetés en supplément sont conservés indéfiniment.',
  },
  {
    question: 'Y a-t-il un engagement ?',
    answer: 'Non, aucun engagement. Vous pouvez annuler à tout moment.',
  },
]

export default function TarifsPage() {
  return (
    <div className="py-12 sm:py-16 md:py-24 lg:py-32">
      <div className="container">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <TierCounter />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold md:text-5xl">
            Choisissez votre{' '}
            <span className="text-primary">formule</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            3 abonnements adaptés à vos besoins. Les fondateurs bénéficient de crédits bonus pendant 6 mois.
          </p>
        </div>

        {/* Subscription Cards */}
        <div className="mt-8 sm:mt-12 md:mt-16">
          <PricingCards />
        </div>

        {/* Fondateurs */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Crown className="h-3 w-3 mr-1" />
              Avantage Fondateur
            </Badge>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold">
              Les premiers inscrits gagnent plus
            </h2>
            <p className="mt-4 text-muted-foreground">
              Les 100 premiers de chaque catégorie reçoivent un multiplicateur de crédits pendant 6 mois.
            </p>
          </div>

          <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-4 max-w-3xl mx-auto">
            {founderTiers.map((tier) => (
              <Card key={tier.name} className="text-center">
                <CardHeader className="pb-2">
                  <span className="text-3xl">{tier.emoji}</span>
                  <CardTitle className={cn('text-lg', tier.color)}>{tier.name}</CardTitle>
                  <CardDescription>Places {tier.places}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{tier.multiplier}</p>
                  <p className="text-xs text-muted-foreground">crédits</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Crédits supplémentaires */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              <ShoppingCart className="h-3 w-3 mr-1" />
              Crédits à la carte
            </Badge>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold">
              Besoin de plus de crédits ?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Achetez des crédits supplémentaires quand vous voulez. Plus vous achetez, moins c'est cher.
            </p>
          </div>

          <div className="mt-8">
            <CreditPackCards />
          </div>
        </div>

        {/* Outils et crédits */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Zap className="h-3 w-3 mr-1" />
              Outils IA
            </Badge>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold">
              Que pouvez-vous faire avec vos crédits ?
            </h2>
          </div>

          <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 max-w-5xl mx-auto">
            {Object.entries(TOOLS_CONFIG).slice(0, 6).map(([key, tool]) => (
              <Card key={key} className="text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{tool.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{tool.credits}</p>
                  <p className="text-xs text-muted-foreground">crédits</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold">Questions fréquentes</h2>
          </div>

          <div className="mx-auto mt-8 max-w-3xl space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-start gap-3 text-base">
                    <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pl-11">
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 sm:mt-16 md:mt-20 rounded-2xl bg-primary/5 p-6 sm:p-8 text-center md:p-12">
          <h2 className="font-heading text-xl sm:text-2xl font-bold md:text-3xl">
            Prêt à nous rejoindre ?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Inscrivez-vous maintenant et profitez des avantages fondateur.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/inscription/livreur">
                Je suis Livreur
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/inscription/professionnel">
                Je suis Professionnel
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
