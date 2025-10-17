import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { requireAuthContext, isAuthError } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function buildReturnUrl(request: NextRequest) {
  const origin = request.headers.get('origin') ?? request.nextUrl.origin
  return new URL('/dashboard/billing', origin).toString()
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuthContext(request)

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('clinic_id', ctx.clinicId)
      .maybeSingle()

    const stripeCustomerId = subscription?.stripe_customer_id
    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: buildReturnUrl(request),
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('portal error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
