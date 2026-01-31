// Configuration Stripe pour SparkHub

export const STRIPE_PRICES = {
  // Abonnement mensuel
  subscription: {
    priceId: 'price_1SvhiaHbbIrNBYlv0CefmYBr',
    name: 'Abonnement SparkHub',
    amount: 990, // en centimes
    interval: 'month',
  },

  // Packs de crédits (prix de base, avant réduction)
  credits: {
    pack_50: {
      priceId: 'price_1SvhnsHbbIrNBYlvUVdVcaSD',
      credits: 50,
      basePrice: 1200, // 12€ en centimes
    },
    pack_100: {
      priceId: 'price_1SvhpUHbbIrNBYlv8zin8ePK',
      credits: 100,
      basePrice: 2400, // 24€ en centimes
    },
    pack_200: {
      priceId: 'price_1SvhqOHbbIrNBYlvZ3QIL4XS',
      credits: 200,
      basePrice: 4800, // 48€ en centimes
    },
  },
} as const

// Réductions selon le statut
export const CREDIT_DISCOUNTS = {
  // Fondateurs (réduction permanente pendant 1 an)
  platine: 0.50,    // -50%
  or: 0.30,         // -30%
  argent: 0.20,     // -20%
  bronze: 0.10,     // -10%

  // Abonnés (sans statut fondateur)
  subscriber: 0.20, // -20%

  // Sans abonnement
  none: 0,          // prix plein
} as const

// Calcule le prix final d'un pack selon le statut
export function calculateCreditPackPrice(
  packKey: keyof typeof STRIPE_PRICES.credits,
  founderStatus: keyof typeof CREDIT_DISCOUNTS | null,
  isSubscriber: boolean
): number {
  const pack = STRIPE_PRICES.credits[packKey]
  let discount = 0

  if (founderStatus && founderStatus in CREDIT_DISCOUNTS) {
    discount = CREDIT_DISCOUNTS[founderStatus as keyof typeof CREDIT_DISCOUNTS]
  } else if (isSubscriber) {
    discount = CREDIT_DISCOUNTS.subscriber
  }

  return Math.round(pack.basePrice * (1 - discount))
}

// Prix par crédit selon le statut
export function getPricePerCredit(
  founderStatus: keyof typeof CREDIT_DISCOUNTS | null,
  isSubscriber: boolean
): number {
  // Prix de base: 0.24€ par crédit (12€ / 50 crédits)
  const basePrice = 0.24

  let discount = 0
  if (founderStatus && founderStatus in CREDIT_DISCOUNTS) {
    discount = CREDIT_DISCOUNTS[founderStatus as keyof typeof CREDIT_DISCOUNTS]
  } else if (isSubscriber) {
    discount = CREDIT_DISCOUNTS.subscriber
  }

  return basePrice * (1 - discount)
}
