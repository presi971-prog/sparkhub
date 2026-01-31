// Configuration Stripe pour SparkHub

// Bonus crédits pour les fondateurs (pendant 6 mois)
export const FOUNDER_CREDIT_MULTIPLIER = {
  platine: 2.0,    // x2 crédits (équivalent -50%)
  or: 1.43,        // x1.43 crédits (équivalent -30%)
  argent: 1.25,    // x1.25 crédits (équivalent -20%)
  bronze: 1.10,    // x1.10 crédits (équivalent -10%)
  standard: 1.0,   // crédits normaux
} as const

export const STRIPE_PRICES = {
  // Abonnements mensuels
  subscriptions: {
    basic: {
      priceId: 'price_1SvhiaHbbIrNBYlv0CefmYBr',
      name: 'Abonnement Basic',
      amount: 990, // 9.90€ en centimes
      baseCredits: 50,
    },
    pro: {
      priceId: 'price_1SviraHbbIrNBYlvIHQz8fAC',
      name: 'Abonnement Pro',
      amount: 1990, // 19.90€ en centimes
      baseCredits: 150,
    },
    premium: {
      priceId: 'price_1SvisCHbbIrNBYlvw8Jjqiu0',
      name: 'Abonnement Premium',
      amount: 2990, // 29.90€ en centimes
      baseCredits: 300,
    },
  },

  // Packs de crédits supplémentaires (même prix pour tous)
  credits: {
    pack_50: {
      priceId: 'price_1SvhnsHbbIrNBYlvUVdVcaSD',
      credits: 50,
      price: 1200, // 12€
    },
    pack_100: {
      priceId: 'price_1SvhpUHbbIrNBYlv8zin8ePK',
      credits: 100,
      price: 2000, // 20€ (dégressif)
    },
    pack_200: {
      priceId: 'price_1SvhqOHbbIrNBYlvZ3QIL4XS',
      credits: 200,
      price: 3600, // 36€ (dégressif)
    },
  },
} as const

// Calcule les crédits d'un abonnement selon le statut fondateur
export function getSubscriptionCredits(
  plan: keyof typeof STRIPE_PRICES.subscriptions,
  founderStatus: keyof typeof FOUNDER_CREDIT_MULTIPLIER | null
): number {
  const subscription = STRIPE_PRICES.subscriptions[plan]
  const multiplier = founderStatus
    ? FOUNDER_CREDIT_MULTIPLIER[founderStatus]
    : FOUNDER_CREDIT_MULTIPLIER.standard

  return Math.round(subscription.baseCredits * multiplier)
}

// Prix par crédit selon le plan
export function getPricePerCredit(plan: keyof typeof STRIPE_PRICES.subscriptions, founderStatus: keyof typeof FOUNDER_CREDIT_MULTIPLIER | null): number {
  const subscription = STRIPE_PRICES.subscriptions[plan]
  const credits = getSubscriptionCredits(plan, founderStatus)
  return subscription.amount / 100 / credits
}
