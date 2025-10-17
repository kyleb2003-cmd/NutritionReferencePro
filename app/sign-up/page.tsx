import { redirect } from 'next/navigation'
import { stripe, priceId, LOOKUP_SINGLE } from '@/lib/stripe'
import { admin } from '@/lib/supa-admin'

export const runtime = 'nodejs'

export default function SignUpPage() {
  async function signUp(formData: FormData) {
    'use server'
    const clinic_name = String(formData.get('clinic_name') || '').trim()
    const contact_name = String(formData.get('contact_name') || '').trim()
    const username = String(formData.get('username') || '').trim()
    const email = String(formData.get('email') || '').trim().toLowerCase()
    const billing = String(formData.get('billing') || 'card')

    if (!clinic_name || !username || !email) throw new Error('Missing required fields')

    const supa = admin()
    const customer = await stripe.customers.create({ email, name: clinic_name || contact_name || email })

    const up = await supa
      .from('pending_signups')
      .upsert({ email, username, clinic_name, contact_name, stripe_customer_id: customer.id }, { onConflict: 'email' })
      .select('id')
      .single()

    if (up.error) throw up.error
    const pendingId = up.data!.id

    const single = await priceId(LOOKUP_SINGLE)
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    if (billing === 'card') {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customer.id,
        client_reference_id: String(pendingId),
        success_url: `${origin}/post-checkout?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/sign-up?canceled=1`,
        billing_address_collection: 'required',
        line_items: [{ price: single, quantity: 1 }],
      })
      redirect(session.url!)
    } else {
      await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: single, quantity: 1 }],
        collection_method: 'send_invoice',
        days_until_due: 30,
      })
      redirect(`/sign-up/sent?email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold mb-2">Create your account</h1>
      <p className="text-neutral-600 mb-6">
        Plan: <strong>$49/mo</strong>. You’ll set your password after payment (card), or after invoice posts.
      </p>
      <form action={signUp} className="space-y-4">
        <label className="block">
          <span className="text-sm">Clinic / Business Name</span>
          <input name="clinic_name" required className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">Your name</span>
          <input name="contact_name" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">Choose a username</span>
          <input name="username" required className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">Work email (for billing)</span>
          <input name="email" type="email" required className="mt-1 w-full rounded border px-3 py-2" />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm mb-2">Billing method</legend>
          <label className="mr-6">
            <input type="radio" name="billing" value="card" defaultChecked /> Card (instant access)
          </label>
          <label className="mr-6">
            <input type="radio" name="billing" value="invoice" /> Invoice (access after payment)
          </label>
        </fieldset>

        <button className="rounded bg-black text-white px-4 py-2">Continue</button>
      </form>
    </main>
  )
}
