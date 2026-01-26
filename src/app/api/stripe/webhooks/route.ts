import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

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

        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionData = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subscription = subscriptionData as any

          // Get user's tier
          const { data: profile } = await supabase
            .from('profiles')
            .select('tier_id')
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
