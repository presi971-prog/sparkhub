'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckoutButton } from '@/components/checkout-button'
import { STRIPE_PRICES } from '@/config/stripe'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const subscriptionPlans = [
  {
    key: 'basic' as const,
    name: 'Basic',
    emoji: '⭐',
    price: 9.90,
    popular: false,
    features: [
      '50 crédits/mois (jusqu\'à 100 pour fondateurs)',
      'Accès à tous les outils IA',
      'Support par email',
    ],
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    emoji: '🚀',
    price: 19.90,
    popular: true,
    features: [
      '150 crédits/mois (jusqu\'à 300 pour fondateurs)',
      'Accès à tous les outils IA',
      'Support prioritaire',
      'Exports haute qualité',
    ],
  },
  {
    key: 'premium' as const,
    name: 'Premium',
    emoji: '👑',
    price: 29.90,
    popular: false,
    features: [
      '300 crédits/mois (jusqu\'à 600 pour fondateurs)',
      'Accès à tous les outils IA',
      'Support prioritaire 24/7',
      'Exports haute qualité',
      'Fonctionnalités beta',
    ],
  },
]

export function PricingCards() {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto">
      {subscriptionPlans.map((plan) => {
        const priceId = STRIPE_PRICES.subscriptions[plan.key].priceId

        return (
          <Card
            key={plan.key}
            className={cn(
              'relative flex flex-col',
              plan.popular && 'border-primary border-2 md:scale-105 shadow-lg'
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  Populaire
                </Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <span className="text-4xl">{plan.emoji}</span>
              <CardTitle className="mt-2">{plan.name}</CardTitle>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="text-center">
                <p className="text-4xl font-bold">
                  {plan.price}€
                  <span className="text-sm font-normal text-muted-foreground">/mois</span>
                </p>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <CheckoutButton
                priceId={priceId}
                mode="subscription"
                variant={plan.popular ? 'default' : 'outline'}
                className="w-full"
              >
                S'abonner
              </CheckoutButton>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

const creditPacks = [
  { key: 'pack_50' as const, credits: 50, price: 12, pricePerCredit: 0.24 },
  { key: 'pack_100' as const, credits: 100, price: 20, pricePerCredit: 0.20, savings: '17%' },
  { key: 'pack_200' as const, credits: 200, price: 36, pricePerCredit: 0.18, savings: '25%' },
]

export function CreditPackCards() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto">
      {creditPacks.map((pack) => {
        const priceId = STRIPE_PRICES.credits[pack.key].priceId

        return (
          <Card key={pack.credits} className="text-center">
            <CardHeader>
              <CardTitle>{pack.credits} crédits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-3xl font-bold">{pack.price}€</p>
                <p className="text-sm text-muted-foreground">{pack.pricePerCredit}€/crédit</p>
                {pack.savings && (
                  <Badge variant="secondary" className="mt-2">
                    -{pack.savings}
                  </Badge>
                )}
              </div>
              <CheckoutButton
                priceId={priceId}
                mode="payment"
                variant="outline"
                className="w-full"
              >
                Acheter
              </CheckoutButton>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
