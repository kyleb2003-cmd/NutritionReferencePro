import type { User } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'

export type ProvisionInput = {
  sessionId?: string
  session?: Stripe.Checkout.Session | null
  subscription?: Stripe.Subscription | null
  stripeCustomerId?: string | null
  clinicName?: string | null
  user?: User | null
}

type ProvisionResult = {
  clinicId: string
  stripeCustomerId: string
  subscriptionId?: string
  status?: string
}

type PostgrestError = {
  code: string
  message: string
  detail?: string | null
  hint?: string | null
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

function logStage(stage: string, ctx?: unknown) {
  console.log(`[provision] ${stage}`, ctx ?? '')
}

function fail(stage: string, err: unknown): never {
  if (err && typeof err === 'object' && 'code' in err) {
    const pg = err as PostgrestError
    console.error(`[provision] FAILED @ ${stage}`, {
      code: pg.code,
      message: pg.message,
      detail: pg.detail,
      hint: pg.hint,
    })
  } else {
    console.error(`[provision] FAILED @ ${stage}`, err)
  }
  throw new Error('Provisioning failed')
}

function pickClinicName(inputClinicName: string | null | undefined, session: Stripe.Checkout.Session, customer: Stripe.Customer | null): string {
  const sessionMetaClinic =
    session?.metadata && typeof session.metadata.clinic_name === 'string' && session.metadata.clinic_name.trim()
      ? session.metadata.clinic_name.trim()
      : null
  const customerName =
    customer && typeof customer.name === 'string' && customer.name.trim() ? customer.name.trim() : null
  const customerEmail =
    customer && typeof customer.email === 'string' && customer.email.trim() ? customer.email.trim() : null
  return (
    (inputClinicName && inputClinicName.trim()) ||
    sessionMetaClinic ||
    customerName ||
    customerEmail ||
    'Clinic'
  )
}

export async function provisionFromStripe(input: ProvisionInput): Promise<ProvisionResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    fail('env:supabase', new Error('missing SUPABASE envs'))
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    fail('env:stripe', new Error('missing STRIPE_SECRET_KEY'))
  }

  const supa = createAdminClient()

  const sessionExpand = ['customer', 'subscription', 'subscription.items.data.price'] as const

  let session = input.session ?? null
  let subscription = input.subscription ?? null
  let stripeCustomerId = input.stripeCustomerId ?? null
  let customer: Stripe.Customer | null = null

  const ensureSession = async (id: string): Promise<Stripe.Checkout.Session> => {
    try {
      const retrieved = await stripe.checkout.sessions.retrieve(id, { expand: sessionExpand })
      logStage('session.retrieved', {
        id: retrieved.id,
        customer: retrieved.customer,
        subscription:
          typeof retrieved.subscription === 'object'
            ? (retrieved.subscription as Stripe.Subscription)?.id
            : retrieved.subscription,
      })
      return retrieved
    } catch (err) {
      fail('stripe.sessions.retrieve', err)
    }
  }

  const sessionNeedsExpansion =
    !!session &&
    (typeof session.customer === 'string' ||
      typeof session.subscription === 'string' ||
      (typeof session.subscription === 'object' &&
        !!session.subscription &&
        !(session.subscription as Stripe.Subscription).items?.data?.every((item) => !!item.price)))

  if (session?.id && sessionNeedsExpansion) {
    session = await ensureSession(session.id)
  } else if (!session && input.sessionId) {
    session = await ensureSession(input.sessionId)
  }

  if (session) {
    if (typeof session.customer === 'object' && session.customer && !('deleted' in session.customer)) {
      customer = session.customer as Stripe.Customer
      stripeCustomerId = stripeCustomerId ?? customer.id
    } else if (typeof session.customer === 'string') {
      stripeCustomerId = stripeCustomerId ?? session.customer
    }

    if (!subscription && typeof session.subscription === 'object' && session.subscription) {
      subscription = session.subscription as Stripe.Subscription
    }
  }

  if (!stripeCustomerId && subscription) {
    if (typeof subscription.customer === 'string') {
      stripeCustomerId = subscription.customer
    } else if (subscription.customer && !subscription.customer.deleted) {
      stripeCustomerId = subscription.customer.id
    }
  }

  if (!session) {
    fail('derive.session', new Error('missing checkout session'))
  }

  if (!stripeCustomerId) {
    fail('derive.customerId', new Error('no customer id'))
  }

  const clinicName = pickClinicName(input.clinicName ?? null, session, customer)

  let clinicId: string
  try {
    const { data: clinicRow, error: clinicErr } = await supa
      .from('clinics')
      .upsert(
        { stripe_customer_id: stripeCustomerId, clinic_name: clinicName },
        { onConflict: 'stripe_customer_id' }
      )
      .select('id')
      .single<{ id: string }>()

    if (clinicErr || !clinicRow) {
      fail('db.clinics.upsert', clinicErr ?? new Error('clinic upsert missing id'))
    }

    clinicId = clinicRow.id
    logStage('clinic.upserted', { clinicId, stripeCustomerId })
  } catch (err) {
    fail('db.clinics.upsert.throw', err)
  }

  try {
    const priceId = subscription?.items?.data?.[0]?.price?.id ?? null
    const currentPeriodEndIso = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null
    const stripeSubscriptionId = subscription?.id ?? null
    const status = subscription?.status ?? null

    const { data: subsRow, error: subsErr } = await supa
      .from('subscriptions')
      .upsert(
        {
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          price_id: priceId,
          status,
          current_period_end: currentPeriodEndIso,
          clinic_id: clinicId,
        },
        { onConflict: 'stripe_customer_id' }
      )
      .select('id')
      .single<{ id: string }>()

    if (subsErr || !subsRow) {
      fail('db.subscriptions.upsert', subsErr ?? new Error('subscription upsert missing id'))
    }

    console.log('[provision] subs.upserted', {
      clinicId,
      stripeCustomerId,
      stripeSubscriptionId,
      status,
      priceId,
      currentPeriodEnd: currentPeriodEndIso,
      upsertedId: subsRow.id,
    })
  } catch (err) {
    fail('db.subscriptions.upsert.throw', err)
  }

  try {
    if (input.user) {
      const { id: user_id, email: userEmail, user_metadata } = input.user
      const metadataUsername =
        typeof user_metadata?.username === 'string' && user_metadata.username.trim()
          ? user_metadata.username.trim()
          : ''
      const username = metadataUsername || (userEmail ? userEmail.split('@')[0] : null)

      const { error: profErr } = await supa
        .from('profiles')
        .upsert(
          { user_id, clinic_id: clinicId, username, email: userEmail ?? null },
          { onConflict: 'user_id' }
        )

      if (profErr) {
        fail('db.profiles.upsert', profErr)
      }

      console.log('[provision] profile.upserted', { user_id, clinicId, username, email: userEmail ?? null })
    } else {
      logStage('profiles.skipped.webhook')
    }
  } catch (err) {
    fail('db.profiles.upsert.throw', err)
  }

  return {
    clinicId,
    stripeCustomerId,
    subscriptionId: subscription?.id,
    status: subscription?.status,
  }
}
