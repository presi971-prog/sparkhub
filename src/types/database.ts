export type UserRole = 'livreur' | 'professionnel' | 'admin'

export type TierType = 'platine' | 'or' | 'argent' | 'bronze' | 'standard'

export type VehicleType = 'scooter' | 'moto' | 'voiture' | 'utilitaire' | 'velo' | 'velo_cargo'

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'

export type ProfileSubscriptionStatus = 'active' | 'cancelled' | 'inactive'

export interface Tier {
  id: string
  name: TierType
  display_name: string
  emoji: string
  max_places: number
  min_rank: number
  discount_percent: number
  monthly_credits: number             // Crédits mensuels
  credits_validity_months: number | null  // Durée de validité (null = illimité)
  bonus_credits: number               // Crédits offerts à l'inscription (actuellement 0)
  promo_price: number
  promo_duration_months: number
  regular_price: number
  features: string[]
  created_at: string
}

export type FounderStatus = 'platine' | 'or' | 'argent' | 'bronze' | 'standard' | null

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  tier_id: string | null
  tier?: Tier
  rank_number: number | null
  points: number
  level: number
  stripe_customer_id: string | null
  subscription_status: ProfileSubscriptionStatus
  cancelled_at: string | null
  grace_period_ends_at: string | null
  founder_status: FounderStatus
  founder_credits_multiplier: number | null
  founder_benefits_end_at: string | null
  created_at: string
  updated_at: string
}

export interface Livreur {
  id: string
  profile_id: string
  profile?: Profile
  vehicle_type: VehicleType
  vehicle_brand: string | null
  vehicle_model: string | null
  license_plate: string | null
  siret: string | null
  has_permit: boolean
  has_insurance: boolean
  is_verified: boolean
  is_available: boolean
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Professionnel {
  id: string
  profile_id: string
  profile?: Profile
  company_name: string
  siret: string | null
  address: string | null
  sector: string | null
  description: string | null
  delivery_needs: string[]
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Commune {
  id: string
  name: string
  code_postal: string
  latitude: number
  longitude: number
  zone: 'basse_terre' | 'grande_terre' | 'marie_galante' | 'les_saintes' | 'la_desirade'
  population: number | null
  created_at: string
}

export interface ZoneLivraison {
  id: string
  livreur_id: string
  commune_id: string
  commune?: Commune
  is_primary: boolean
  created_at: string
}

export interface Subscription {
  id: string
  profile_id: string
  tier_id: string
  tier?: Tier
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

// Système de crédits
export interface Credits {
  id: string
  profile_id: string
  balance: number
  lifetime_earned: number
  lifetime_spent: number
  updated_at: string
}

export type CreditTransactionType =
  | 'subscription_credit'    // Crédits mensuels reçus
  | 'subscription_reset'     // Reset mensuel (mise à zéro)
  | 'purchase'               // Achat de crédits
  | 'usage_subscription'     // Utilisation de crédits abonnement
  | 'usage_purchased'        // Utilisation de crédits achetés (2x coût)

export interface CreditTransaction {
  id: string
  user_id: string
  transaction_type: CreditTransactionType
  amount: number                     // Positif pour crédit, négatif pour débit
  credit_cost: number | null         // Coût en crédits de l'opération
  effective_cost: number | null      // Coût effectif (2x pour crédits achetés)
  tool_id: string | null
  tool_name: string | null
  subscription_balance_after: number | null
  purchased_balance_after: number | null
  payment_id: string | null
  description: string | null
  created_at: string
}

export type CreditPurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface CreditPurchase {
  id: string
  user_id: string
  credits_amount: number
  price_cents: number
  currency: string
  stripe_payment_intent_id: string | null
  stripe_session_id: string | null
  status: CreditPurchaseStatus
  created_at: string
  completed_at: string | null
}

export type TierChangeReason = 'subscription' | 'cancellation' | 'grace_period_expired' | 'resubscription'

export interface TierHistory {
  id: string
  user_id: string
  previous_tier_id: string | null
  new_tier_id: string | null
  previous_rank: number | null
  new_rank: number | null
  reason: TierChangeReason
  created_at: string
}

export interface Ressource {
  id: string
  title: string
  description: string | null
  details: string | null
  image_url: string | null
  url: string
  category: string
  credit_cost: number
  is_active: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: 'debutant' | 'progression' | 'expert' | 'special'
  points_reward: number
  condition_type: string
  condition_value: number
  created_at: string
}

export interface ProfileBadge {
  id: string
  profile_id: string
  badge_id: string
  badge?: Badge
  earned_at: string
}

export interface Avis {
  id: string
  from_profile_id: string
  to_profile_id: string
  from_profile?: Profile
  rating: number
  comment: string | null
  created_at: string
}

export interface Geolocalisation {
  id: string
  livreur_id: string
  latitude: number
  longitude: number
  accuracy: number | null
  heading: number | null
  speed: number | null
  timestamp: string
}

// ============================================
// WhatsApp Chatbot
// ============================================

export type CommerceType = 'restaurant' | 'artisan' | 'beaute' | 'commerce'
export type ConversationStatus = 'active' | 'closed'
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Commerce {
  id: string
  profile_id: string
  nom: string
  type: CommerceType
  description: string | null
  adresse: string | null
  telephone: string | null
  horaires: Record<string, string>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CommerceItem {
  id: string
  commerce_id: string
  categorie: string
  nom: string
  prix: number | null
  description: string | null
  ordre: number
  created_at: string
}

export interface CommerceFaq {
  id: string
  commerce_id: string
  question: string
  reponse: string
  created_at: string
}

export interface WhatsAppMessage {
  role: 'client' | 'bot'
  content: string
  timestamp: string
}

export interface WhatsAppConversation {
  id: string
  commerce_id: string | null
  client_phone: string
  client_name: string | null
  messages: WhatsAppMessage[]
  status: ConversationStatus
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: string
  commerce_id: string
  client_phone: string
  client_name: string | null
  date: string
  heure: string
  nombre_personnes: number | null
  note: string | null
  status: ReservationStatus
  created_at: string
}

// Database schema type for Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'points' | 'level' | 'rank_number'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      livreurs: {
        Row: Livreur
        Insert: Omit<Livreur, 'id' | 'created_at' | 'updated_at' | 'is_verified'>
        Update: Partial<Omit<Livreur, 'id' | 'created_at'>>
      }
      professionnels: {
        Row: Professionnel
        Insert: Omit<Professionnel, 'id' | 'created_at' | 'updated_at' | 'is_verified'>
        Update: Partial<Omit<Professionnel, 'id' | 'created_at'>>
      }
      communes: {
        Row: Commune
        Insert: Omit<Commune, 'id' | 'created_at'>
        Update: Partial<Omit<Commune, 'id' | 'created_at'>>
      }
      zones_livraison: {
        Row: ZoneLivraison
        Insert: Omit<ZoneLivraison, 'id' | 'created_at'>
        Update: Partial<Omit<ZoneLivraison, 'id' | 'created_at'>>
      }
      tiers: {
        Row: Tier
        Insert: Omit<Tier, 'id' | 'created_at'>
        Update: Partial<Omit<Tier, 'id' | 'created_at'>>
      }
      subscriptions: {
        Row: Subscription
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Subscription, 'id' | 'created_at'>>
      }
      credits: {
        Row: Credits
        Insert: Omit<Credits, 'id' | 'updated_at'>
        Update: Partial<Omit<Credits, 'id'>>
      }
      credit_transactions: {
        Row: CreditTransaction
        Insert: Omit<CreditTransaction, 'id' | 'created_at'>
        Update: never
      }
      credit_purchases: {
        Row: CreditPurchase
        Insert: Omit<CreditPurchase, 'id' | 'created_at'>
        Update: Partial<Omit<CreditPurchase, 'id' | 'created_at'>>
      }
      ressources: {
        Row: Ressource
        Insert: Omit<Ressource, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Ressource, 'id' | 'created_at'>>
      }
      badges: {
        Row: Badge
        Insert: Omit<Badge, 'id' | 'created_at'>
        Update: Partial<Omit<Badge, 'id' | 'created_at'>>
      }
      profile_badges: {
        Row: ProfileBadge
        Insert: Omit<ProfileBadge, 'id' | 'earned_at'>
        Update: never
      }
      avis: {
        Row: Avis
        Insert: Omit<Avis, 'id' | 'created_at'>
        Update: Partial<Omit<Avis, 'id' | 'created_at'>>
      }
      geolocalisations: {
        Row: Geolocalisation
        Insert: Omit<Geolocalisation, 'id'>
        Update: Partial<Omit<Geolocalisation, 'id'>>
      }
      commerces: {
        Row: Commerce
        Insert: Omit<Commerce, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Commerce, 'id' | 'created_at'>>
      }
      commerce_items: {
        Row: CommerceItem
        Insert: Omit<CommerceItem, 'id' | 'created_at'>
        Update: Partial<Omit<CommerceItem, 'id' | 'created_at'>>
      }
      commerce_faq: {
        Row: CommerceFaq
        Insert: Omit<CommerceFaq, 'id' | 'created_at'>
        Update: Partial<Omit<CommerceFaq, 'id' | 'created_at'>>
      }
      whatsapp_conversations: {
        Row: WhatsAppConversation
        Insert: Omit<WhatsAppConversation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<WhatsAppConversation, 'id' | 'created_at'>>
      }
      reservations: {
        Row: Reservation
        Insert: Omit<Reservation, 'id' | 'created_at'>
        Update: Partial<Omit<Reservation, 'id' | 'created_at'>>
      }
    }
  }
}
