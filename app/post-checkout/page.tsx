import type Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { stripe } from '@/lib/stripe'
import { admin } from '@/lib/supa-admin'

export const runtime = 'nodejs'

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>

export default async function PostCheckoutPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const sp = await searchParams
  const sid = (sp.session_id as string) || ''
  if (!sid) redirect('/sign-up')

  const session = await stripe.checkout.sessions.retrieve(sid, { expand: ['subscription', 'customer'] })
  const email =
    session.customer_details?.email ||
    (typeof session.customer === 'object' && session.customer && !('deleted' in session.customer)
      ? (session.customer as Stripe.Customer).email
      : undefined)
  const customerId = resolveCustomerId(session)
  const pendingId = session.client_reference_id
  const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

  if (!email || !customerId || !pendingId || !subId) {
    return (
      <main className="p-8">
        <p className="text-red-600">Missing checkout details. Please contact support.</p>
      </main>
    )
  }

  const subscription = await stripe.subscriptions.retrieve(subId)
  const isActive = subscription.status === 'active' || subscription.status === 'trialing'
  if (!isActive) {
    return (
      <main className="p-8">
        <p className="text-yellow-700">
          Payment is processing. You’ll be able to set your password once it’s active.
        </p>
      </main>
    )
  }

  const safeEmail = email as string
  const safeCustomerId = customerId as string

  async function provision(formData: FormData) {
    'use server'
    const password = String(formData.get('password') || '')
    if (!password) throw new Error('Password required')

    const supa = admin()

    const pending = await supa.from('pending_signups').select('*').eq('id', pendingId).single()
    if (pending.error || !pending.data) throw pending.error || new Error('Pending sign-up not found')

    const { clinic_name, contact_name, username } = pending.data as {
      clinic_name: string
      contact_name: string | null
      username: string
    }

    const clinic = await supa
      .from('clinics')
      .upsert({ stripe_customer_id: safeCustomerId, clinic_name }, { onConflict: 'stripe_customer_id' })
      .select('id')
      .single()
    if (clinic.error || !clinic.data?.id) throw clinic.error || new Error('Clinic upsert failed')
    const clinicId = clinic.data.id as string

    const created = await supa.auth.admin.createUser({
      email: safeEmail,
      password,
      email_confirm: true,
      user_metadata: { stripe_customer_id: safeCustomerId, username, clinic_name, contact_name },
    })

    const already =
      !!created.error &&
      (created.error.status === 422 || /already/i.test(created.error.message || ''))

    if (created.error && !already) {
      throw created.error
    }

    let userId = created.data?.user?.id ?? null
    if (!userId && already) {
      const lookup = await supa.auth.admin.listUsers({ page: 1, perPage: 100 })
      userId = lookup.data?.users?.find((u) => u.email?.toLowerCase() === safeEmail.toLowerCase())?.id ?? null
    }

    await supa
      .from('subscriptions')
      .upsert(
        {
          stripe_customer_id: safeCustomerId,
          clinic_id: clinicId,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        },
        { onConflict: 'stripe_customer_id' }
      )

    if (userId) {
      await supa
        .from('profiles')
        .upsert({
          user_id: userId,
          username,
          work_email: safeEmail,
          contact_name,
          clinic_id: clinicId,
        })
      const link = await supa
        .from('clinic_users')
        .insert({ clinic_id: clinicId, user_id: userId, role: 'owner' })
      if (link.error && link.error.code !== '23505') {
        throw link.error
      }
    }

    await supa.from('pending_signups').delete().eq('id', pendingId)

    redirect('/auth/sign-in?provisioned=1')
  }

  return (
    <main className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2">Set your password</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Email (for billing): <strong>{email}</strong>
      </p>
      <form action={provision} className="space-y-3">
        <label className="block">
          <span className="text-sm">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <button className="rounded-md bg-black px-4 py-2 text-white">Create account</button>
      </form>
    </main>
  )
}

function resolveCustomerId(session: Stripe.Checkout.Session): string | undefined {
  const customer = session.customer
  if (typeof customer === 'string') return customer
  if (customer && !customer.deleted) {
    return customer.id
  }
  return undefined
}
