import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'
import { STRIPE_PRICES, FOUNDER_CREDIT_MULTIPLIER } from '@/config/stripe'
import Stripe from 'stripe'

// Helper to get plan from price ID
function getPlanFromPriceId(priceId: string): 'basic' | 'pro' | 'premium' | null {
  if (priceId === STRIPE_PRICES.subscriptions.basic.priceId) return 'basic'
  if (priceId === STRIPE_PRICES.subscriptions.pro.priceId) return 'pro'
  if (priceId === STRIPE_PRICES.subscriptions.premium.priceId) return 'premium'
  return null
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id

        if (!userId) break

        // Handle credit pack purchases (one-time payment)
        if (session.mode === 'payment' && session.metadata?.type === 'credits') {
          const credits = parseInt(session.metadata?.credits || '0')

          if (credits > 0) {
            // Get current credits or create if not exists
            const { data: currentCredits } = await supabase
              .from('credits')
              .select('balance, lifetime_earned')
              .eq('profile_id', userId)
              .single()

            if (currentCredits) {
              await supabase
                .from('credits')
                .update({
                  balance: (currentCredits.balance || 0) + credits,
                  lifetime_earned: (currentCredits.lifetime_earned || 0) + credits,
                })
                .eq('profile_id', userId)
            } else {
              await supabase
                .from('credits')
                .insert({
                  profile_id: userId,
                  balance: credits,
                  lifetime_earned: credits,
                  lifetime_spent: 0,
                })
            }

            // Log transaction
            await supabase.from('credit_transactions').insert({
              profile_id: userId,
              amount: credits,
              type: 'purchase',
              description: `Achat de ${credits} crédits`,
              reference_id: session.id,
            })

            console.log(`Added ${credits} credits to user ${userId}`)
          }
          break
        }

        // Handle subscription checkout
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionData = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subscription = subscriptionData as any

          // Get the price ID from the subscription
          const priceId = subscription.items?.data?.[0]?.price?.id
          const plan = getPlanFromPriceId(priceId)

          // Get user's profile with founder status
          const { data: profile } = await supabase
            .from('profiles')
            .select('tier_id, founder_status')
            .eq('id', userId)
            .single()

          // Create subscription record
          await supabase.from('subscriptions').upsert({
            profile_id: userId,
            tier_id: profile?.tier_id,
            stripe_subscription_id: subscription.id,
            status: subscription.status as 'active' | 'trialing',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })

          // Add credits based on plan and founder status
          if (plan) {
            const baseCredits = STRIPE_PRICES.subscriptions[plan].baseCredits
            const founderStatus = profile?.founder_status as keyof typeof FOUNDER_CREDIT_MULTIPLIER | null
            const multiplier = founderStatus && FOUNDER_CREDIT_MULTIPLIER[founderStatus]
              ? FOUNDER_CREDIT_MULTIPLIER[founderStatus]
              : 1
            const credits = Math.round(baseCredits * multiplier)

            // Get current credits or create if not exists
            const { data: currentCredits } = await supabase
              .from('credits')
              .select('balance, lifetime_earned')
              .eq('profile_id', userId)
              .single()

            if (currentCredits) {
              await supabase
                .from('credits')
                .update({
                  balance: (currentCredits.balance || 0) + credits,
                  lifetime_earned: (currentCredits.lifetime_earned || 0) + credits,
                })
                .eq('profile_id', userId)
            } else {
              await supabase
                .from('credits')
                .insert({
                  profile_id: userId,
                  balance: credits,
                  lifetime_earned: credits,
                  lifetime_spent: 0,
                })
            }

            // Log transaction
            await supabase.from('credit_transactions').insert({
              profile_id: userId,
              amount: credits,
              type: 'purchase',
              description: `Abonnement ${plan.charAt(0).toUpperCase() + plan.slice(1)} - ${credits} crédits`,
              reference_id: subscription.id,
            })
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscriptionData = event.data.object as Stripe.Subscription
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = subscriptionData as any
        const userId = subscription.metadata?.user_id

        if (!userId) break

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status as 'active' | 'canceled' | 'past_due' | 'unpaid',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        // Add credits if it's a credit purchase (one-time payment)
        if (invoice.metadata?.type === 'credits') {
          const userId = invoice.metadata?.user_id
          const credits = parseInt(invoice.metadata?.credits || '0')

          if (userId && credits > 0) {
            // Update credits balance
            const { data: currentCredits } = await supabase
              .from('credits')
              .select('balance, lifetime_earned')
              .eq('profile_id', userId)
              .single()

            await supabase
              .from('credits')
              .update({
                balance: (currentCredits?.balance || 0) + credits,
                lifetime_earned: (currentCredits?.lifetime_earned || 0) + credits,
              })
              .eq('profile_id', userId)

            // Log transaction
            await supabase.from('credit_transactions').insert({
              profile_id: userId,
              amount: credits,
              type: 'purchase',
              description: `Achat de ${credits} crédits`,
              reference_id: invoice.id,
            })
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.error('Payment failed for invoice:', invoice.id)
        // Could send email notification here
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
