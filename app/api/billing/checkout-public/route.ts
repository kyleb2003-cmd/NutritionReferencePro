import { NextResponse } from 'next/server'
import { stripe, priceId, LOOKUP_SINGLE } from '@/lib/stripe'

export async function POST(req: Request) {
  try {
    const origin = new URL(req.url).origin
    const single = await priceId(LOOKUP_SINGLE)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${siteUrl}/post-checkout/init?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/canceled`,
      billing_address_collection: 'required',
      line_items: [{ price: single, quantity: 1 }],
    })

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
