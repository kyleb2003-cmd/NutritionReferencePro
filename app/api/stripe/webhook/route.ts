import type Stripe from 'stripe'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { admin } from '@/lib/supa-admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature')
  const raw = await req.text()
  let evt
  try {
    evt = stripe.webhooks.constructEvent(raw, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid signature'
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  const supa = admin()

  if (evt.type === 'customer.subscription.created' || evt.type === 'customer.subscription.updated') {
    const sub = evt.data.object as Stripe.Subscription
    const customerId = resolveCustomerId(sub)
    if (!customerId) {
      return new Response('ok')
    }
    const status = sub.status
    const currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString()

    const clinic = await supa
      .from('clinics')
      .upsert({ stripe_customer_id: customerId }, { onConflict: 'stripe_customer_id' })
      .select('id')
      .single()
    const clinicId = clinic.data?.id ?? null

    await supa
      .from('subscriptions')
      .upsert(
        { stripe_customer_id: customerId, clinic_id: clinicId, status, current_period_end: currentPeriodEnd },
        { onConflict: 'stripe_customer_id' }
      )
  }

  if (evt.type === 'customer.subscription.deleted') {
    const sub = evt.data.object as Stripe.Subscription
    const customerId = resolveCustomerId(sub)
    if (customerId) {
      await supa
        .from('subscriptions')
        .upsert({ stripe_customer_id: customerId, status: 'canceled' }, { onConflict: 'stripe_customer_id' })
    }
  }

  return new Response('ok')
}

function resolveCustomerId(sub: Stripe.Subscription): string | undefined {
  const customer = sub.customer
  if (typeof customer === 'string') return customer
  if (customer && !customer.deleted) {
    return customer.id
  }
  return undefined
}
