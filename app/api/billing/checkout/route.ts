import { NextRequest, NextResponse } from 'next/server'
import { stripe, LOOKUP_SINGLE, priceId } from '@/lib/stripe'
import { requireAuthContext, isAuthError } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { upsertSubscription } from '@/lib/subscription'

export const runtime = 'nodejs'

function buildUrl(request: NextRequest, path: string) {
  const origin = request.headers.get('origin') ?? request.nextUrl.origin
  return new URL(path, origin).toString()
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuthContext(request)
    const singleId = await priceId(LOOKUP_SINGLE)

    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('clinic_id', ctx.clinicId)
      .maybeSingle()

    let stripeCustomerId = existing?.stripe_customer_id ?? null

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: ctx.email ?? undefined,
        metadata: {
          clinic_id: ctx.clinicId,
        },
      })
      stripeCustomerId = customer.id
    } else {
      await stripe.customers.update(stripeCustomerId, {
        email: ctx.email ?? undefined,
        metadata: {
          clinic_id: ctx.clinicId,
        },
      })
    }

    await upsertSubscription({
      clinic_id: ctx.clinicId,
      stripe_customer_id: stripeCustomerId,
      billing_method: 'card',
      status: 'incomplete',
      seat_count: existing?.seat_count ?? 1,
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      billing_address_collection: 'auto',
      metadata: {
        clinic_id: ctx.clinicId,
      },
      subscription_data: {
        metadata: {
          clinic_id: ctx.clinicId,
        },
      },
      line_items: [{ price: singleId, quantity: 1 }],
      success_url: buildUrl(request, '/dashboard/billing?success=1'),
      cancel_url: buildUrl(request, '/dashboard/billing?canceled=1'),
    })

    if (!session.url) {
      throw new Error('Stripe checkout session missing URL')
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('checkout error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
