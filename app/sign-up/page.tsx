import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { stripe, priceId, LOOKUP_SINGLE } from '@/lib/stripe'
import { getServiceClient } from '@/lib/supabase/clients'

export const runtime = 'nodejs'

export default function SignUpPage() {
  async function startCheckout(formData: FormData) {
    'use server'
    const clinicName = String(formData.get('clinic_name') ?? '').trim()
    const username = String(formData.get('username') ?? '').trim()
    const workEmail = String(formData.get('work_email') ?? '').trim().toLowerCase()

    if (!clinicName || !username || !workEmail) {
      throw new Error('Missing required fields')
    }

    const state = randomUUID()
    const supa = getServiceClient()
    const { error: provisionError } = await supa.from('provisioning_sessions').insert({
      state,
      email: workEmail,
      username,
      clinic_name: clinicName,
    })
    if (provisionError) {
      throw provisionError
    }

    const hdrs = await headers()
    const origin = hdrs.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin

    const price = await priceId(LOOKUP_SINGLE)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${siteUrl}/post-checkout/init?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/canceled`,
      customer_email: workEmail,
      client_reference_id: state,
      metadata: {
        flow: 'signup',
        clinic_name: clinicName,
        username,
        work_email: workEmail,
        state,
      },
    })

    redirect(session.url!)
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold mb-2">Create your account</h1>
      <p className="text-neutral-600 mb-6">
        Plan: <strong>$49/mo</strong>. You’ll set your password after payment (card), or after invoice posts.
      </p>
      <form action={startCheckout} className="space-y-4">
        <label className="block">
          <span className="text-sm">Clinic / Business Name</span>
          <input name="clinic_name" required className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">Choose a username</span>
          <input name="username" required className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">Work email (for billing)</span>
          <input name="work_email" type="email" required className="mt-1 w-full rounded border px-3 py-2" />
        </label>

        <button className="rounded bg-black text-white px-4 py-2">Continue</button>
      </form>
    </main>
  )
}
