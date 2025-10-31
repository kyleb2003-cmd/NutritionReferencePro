import type Stripe from 'stripe'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { provisionFromStripe } from '@/lib/billing/provision'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature')
  const raw = await req.text()
  let evt: Stripe.Event
  try {
    evt = stripe.webhooks.constructEvent(raw, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid signature'
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  try {
    if (evt.type === 'checkout.session.completed') {
      let session = evt.data.object as Stripe.Checkout.Session
      try {
        session = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['customer', 'subscription', 'subscription.items.data.price'],
        })
        await provisionFromStripe({
          sessionId: session.id,
          session,
          clinicName: null,
        })
      } catch (error) {
        console.error('[stripe-webhook] checkout.session.completed', error)
      }
      return jsonOk()
    }

    if (evt.type === 'customer.subscription.created') {
      const sub = evt.data.object as Stripe.Subscription
      await mirrorSubscription(sub)
      return jsonOk()
    }

    if (evt.type === 'customer.subscription.updated') {
      const sub = evt.data.object as Stripe.Subscription
      await mirrorSubscription(sub)
      return jsonOk()
    }

    if (evt.type === 'invoice.payment_succeeded' || evt.type === 'invoice.payment_failed') {
      const invoice = evt.data.object as Stripe.Invoice
      const subscriptionId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id ?? null
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price'],
          })
          await mirrorSubscription(sub)
        } catch (error) {
          console.error('[stripe-webhook] invoice.subscription.retrieve_failed', {
            invoiceId: invoice.id,
            subscriptionId,
            message: error instanceof Error ? error.message : String(error),
          })
        }
      } else {
        console.warn('[stripe-webhook] invoice missing subscription', {
          invoiceId: invoice.id,
          customer: invoice.customer ?? null,
        })
      }
      return jsonOk()
    }

    if (evt.type === 'customer.subscription.deleted') {
      const sub = evt.data.object as Stripe.Subscription
      const customerId = resolveCustomerIdFromSubscription(sub)
      if (customerId) {
        const supa = createAdminClient()
        await supa
          .from('subscriptions')
          .upsert({ stripe_customer_id: customerId, status: 'canceled' }, { onConflict: 'stripe_customer_id' })
      }
      return jsonOk()
    }

    return jsonOk()
  } catch (error) {
    console.error('[stripe-webhook]', evt.type, error)
    return new Response('Webhook handler failed', { status: 500 })
  }
}

async function mirrorSubscription(sub: Stripe.Subscription) {
  const customerId = resolveCustomerIdFromSubscription(sub)
  if (!customerId) return

  const supa = createAdminClient()

  const clinic = await supa
    .from('clinics')
    .upsert({ stripe_customer_id: customerId }, { onConflict: 'stripe_customer_id' })
    .select('id')
    .single()

  if (clinic.error) {
    throw clinic.error
  }

  const clinicId = clinic.data?.id ?? null

  const cpe = sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null

  const payload: Record<string, unknown> = {
    stripe_customer_id: customerId,
    status: sub?.status ?? null,
    price_id: sub?.items?.data?.[0]?.price?.id ?? null,
    current_period_end: cpe,
  }

  if (clinicId) {
    payload.clinic_id = clinicId
  }

  const { error } = await supa.from('subscriptions').upsert(payload, { onConflict: 'stripe_customer_id' })
  if (error) {
    throw error
  }

  console.info('[stripe.subscription.sync]', {
    customerId,
    clinicId,
    status: sub?.status ?? null,
    currentPeriodEnd: cpe,
  })
}

function resolveCustomerIdFromSubscription(sub: Stripe.Subscription): string | undefined {
  if (typeof sub.customer === 'string') return sub.customer
  if (sub.customer && !sub.customer.deleted) {
    return sub.customer.id
  }
  return undefined
}

function jsonOk() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
