import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TierCounter } from '@/components/tier-counter'
import { TIERS, TIER_ORDER, REPUTATION_LEVELS, TOOLS_CONFIG } from '@/config/tiers'
import { CheckCircle2, ArrowRight, HelpCircle, Coins, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Tarifs',
  description: 'Découvrez nos tarifs et les avantages exclusifs selon votre ordre d\'inscription.',
}

const faqs = [
  {
    question: 'Comment fonctionne le système de tiers ?',
    answer: 'Votre tier est déterminé par votre ordre d\'inscription. Les 10 premiers inscrits obtiennent le tier Platine avec 200 crédits/mois, les suivants le tier Or avec 150 crédits/mois, etc. Ces avantages sont permanents tant que vous restez abonné !',
  },
  {
    question: 'Quelle est la différence entre les tiers ?',
    answer: 'Tous les tiers coûtent 9€/mois. La différence : le nombre de crédits mensuels (50 à 200) et la durée de validité des crédits non utilisés (1 mois à illimité).',
  },
  {
    question: 'À quoi servent les crédits ?',
    answer: 'Les crédits vous permettent d\'utiliser nos outils IA : génération de posts (2 crédits), création de photos (3-10 crédits), montage de vidéos (5-100 crédits selon la qualité).',
  },
  {
    question: 'Les crédits s\'accumulent-ils ?',
    answer: 'Les crédits de votre abonnement sont remis à zéro chaque mois (pas d\'accumulation). Mais les crédits achetés en supplément sont conservés indéfiniment.',
  },
  {
    question: 'Que se passe-t-il quand mes crédits sont épuisés ?',
    answer: 'Vous pouvez acheter des crédits supplémentaires pour continuer à utiliser les outils. Même avec le coût doublé à l\'utilisation, ça reste bien plus avantageux que les tarifs du marché pour des outils IA de cette qualité !',
  },
  {
    question: 'Y a-t-il un engagement ?',
    answer: 'Non, aucun engagement. Vous pouvez annuler à tout moment.',
  },
  {
    question: 'Que se passe-t-il si je me désabonne ?',
    answer: 'Vous conservez vos crédits achetés, vos points et votre profil. Votre rang est préservé pendant 2 mois : si vous revenez dans ce délai, vous récupérez votre tier. Après 2 mois, vous repartez en fin de file avec le tier correspondant à votre nouvelle place.',
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
            Même prix, plus de{' '}
            <span className="text-primary">valeur</span>{' '}
            pour les premiers
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Tous les abonnements à 9€/mois. Plus vous vous inscrivez tôt, plus vous recevez de crédits.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="mt-8 sm:mt-12 md:mt-16 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TIER_ORDER.map((tierName) => {
            const tier = TIERS[tierName]
            const isPopular = tierName === 'platine'
            const endRank = tierName === 'standard' ? '∞' : tier.minRank + tier.maxPlaces - 1

            return (
              <Card
                key={tierName}
                className={cn(
                  'relative flex flex-col',
                  tier.bgColor,
                  tier.borderColor,
                  'border-2',
                  isPopular && 'md:scale-105 shadow-lg'
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-secondary text-secondary-foreground">
                      Meilleure offre
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <span className="text-4xl">{tier.emoji}</span>
                  <CardTitle className="mt-2">{tier.displayName}</CardTitle>
                  <CardDescription>
                    Places {tier.minRank}-{endRank}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  {/* Prix */}
                  <div className="text-center">
                    <p className="text-3xl font-bold">{tier.price}€<span className="text-sm font-normal">/mois</span></p>
                  </div>

                  {/* Crédits highlight */}
                  <div className="mt-4 rounded-lg bg-primary/10 p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Coins className="h-5 w-5 text-primary" />
                      <p className={cn('text-2xl font-bold', tier.color)}>
                        {tier.monthlyCredits}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      crédits/mois
                    </p>
                  </div>

                  {/* Validité des crédits */}
                  <div className="mt-4 text-center text-sm">
                    <div className="rounded-lg bg-muted p-3">
                      <Clock className="h-4 w-4 mx-auto text-muted-foreground" />
                      <p className="mt-1 font-medium">
                        {tier.creditsValidityMonths === null ? 'Sans expiration' : `Valides ${tier.creditsValidityMonths} mois`}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="mt-6 space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/inscription/livreur">
                      S'inscrire
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* Outils et crédits */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">Outils IA</Badge>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold">
              Que pouvez-vous faire avec vos crédits ?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Une palette complète d'outils pour développer votre activité.
            </p>
          </div>

          <div className="mt-8 sm:mt-12 grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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

        {/* Réputation */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">Réputation</Badge>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold">
              Montez en niveau, gagnez en visibilité
            </h2>
            <p className="mt-4 text-muted-foreground">
              Plus vous êtes actif, plus vous êtes visible. Badges, classement et priorité dans les recherches.
            </p>
          </div>

          <div className="mt-8 sm:mt-12 grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4">
            {Object.values(REPUTATION_LEVELS).map((level) => (
              <Card key={level.name} className="text-center">
                <CardHeader>
                  <span className="text-3xl">{level.emoji}</span>
                  <CardTitle>{level.name}</CardTitle>
                  <CardDescription>{level.min}-{level.max === Infinity ? '∞' : level.max} points</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium text-primary">Badge "{level.badge}"</p>
                  <p className="text-sm text-muted-foreground">+{level.searchBoost}% visibilité</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Gagnez des points via vos livraisons, commandes, avis et parrainages !
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold">Questions fréquentes</h2>
          </div>

          <div className="mx-auto mt-8 sm:mt-12 max-w-3xl space-y-4 sm:space-y-6">
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
            Inscrivez-vous maintenant pour sécuriser votre tier et maximiser vos crédits.
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
