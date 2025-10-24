import Stripe from 'stripe'
import { getServiceClient } from '@/lib/supabase/clients'

export type ProvisionInput = {
  sessionId?: string
  session?: Stripe.Checkout.Session | null
  subscription?: Stripe.Subscription | null
  stripeCustomerId?: string | null
  clinicName?: string | null
  user?: { id: string; email?: string; name?: string | null } | null
  usernameFromSignup?: string | null
  pendingSignup?: { email?: string | null } | null
}

export type ProvisionResult =
  | { ok: true; clinicId: string; subscriptionId: string; currentPeriodEnd: string | null }
  | { ok: false; stage: string; code?: string; message: string }

type PlainError = { message: string; code?: string }

type ProvisionStageError = Error & { stage?: string; code?: string; detail?: string }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

function toPlainError(err: unknown): PlainError {
  const anyErr = err as { code?: unknown; message?: unknown }
  const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined
  const message =
    typeof anyErr?.message === 'string'
      ? anyErr.message
      : typeof err === 'string'
      ? err
      : 'Unknown error'
  return { message, code }
}

function pickSessionMeta(session: unknown) {
  const s = session as Stripe.Checkout.Session & {
    customer?: string | { id?: string }
    subscription?: string | { id?: string }
    customer_details?: { email?: string | null; name?: string | null }
  }
  return {
    id: s?.id ?? null,
    object: (s as { object?: string })?.object ?? null,
    customer: typeof s?.customer === 'string' ? s.customer : s?.customer?.id ?? null,
    subscription:
      typeof s?.subscription === 'string'
        ? s.subscription
        : ((s?.subscription as { id?: string } | null | undefined)?.id ?? null),
    created: (s as { created?: number })?.created ?? null,
    livemode: (s as { livemode?: boolean })?.livemode ?? null,
    email: s?.customer_details?.email ?? null,
    name: s?.customer_details?.name ?? null,
  }
}

function logStage(stage: string, ctx?: unknown) {
  console.log(`[provision] ${stage}`, ctx ?? '')
}

function fail(stage: string, err: unknown): never {
  const plain = toPlainError(err)
  console.error(`[provision] FAILED @ ${stage}`, plain)
  const error = new Error('Provisioning failed') as ProvisionStageError
  error.stage = stage
  error.code = plain.code
  error.detail = plain.message
  throw error
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

function deriveUsername(opts: {
  usernameFromSignup?: string | null
  email?: string | null
  name?: string | null
}): string {
  if (opts.usernameFromSignup && opts.usernameFromSignup.trim()) return opts.usernameFromSignup.trim()
  const base =
    (opts.email?.split('@')[0] ||
      (opts.name ?? '').split(/\s+/)[0] ||
      'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .slice(0, 30)
  return base || 'user'
}

export async function provisionFromStripe(input: ProvisionInput): Promise<ProvisionResult> {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)
    ) {
      fail('env:supabase', new Error('missing SUPABASE envs'))
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      fail('env:stripe', new Error('missing STRIPE_SECRET_KEY'))
    }

    const db = getServiceClient()

    const sessionExpand: Stripe.Checkout.SessionRetrieveParams['expand'] = [
      'customer',
      'subscription',
      'subscription.items.data.price',
    ]

    let session = input.session ?? null
    let stripeCustomerId = input.stripeCustomerId ?? null
    let customer: Stripe.Customer | null = null
    let subscription: Stripe.Subscription | null = input.subscription ?? null

    const ensureSession = async (id: string): Promise<Stripe.Checkout.Session> => {
      try {
        const retrieved = await stripe.checkout.sessions.retrieve(id, { expand: sessionExpand })
        logStage('session.retrieved', pickSessionMeta(retrieved))
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

    if (!session) {
      fail('derive.session', new Error('missing checkout session'))
    }

    if (session) {
      if (typeof session.customer === 'object' && session.customer && !('deleted' in session.customer)) {
        customer = session.customer as Stripe.Customer
        stripeCustomerId = stripeCustomerId ?? customer.id
      } else if (typeof session.customer === 'string') {
        stripeCustomerId = stripeCustomerId ?? session.customer
      }

      if (typeof session.subscription === 'object' && session.subscription) {
        subscription = session.subscription as Stripe.Subscription
      }
    }

    if (!subscription && session && typeof session.subscription === 'string') {
      try {
        subscription = await stripe.subscriptions.retrieve(session.subscription, {
          expand: ['items.data.price'],
        })
      } catch (err) {
        fail('stripe.subscriptions.retrieve', err)
      }
    }

    if (!stripeCustomerId && subscription) {
      if (typeof subscription.customer === 'string') {
        stripeCustomerId = subscription.customer
      } else if (subscription.customer && !subscription.customer.deleted) {
        stripeCustomerId = subscription.customer.id
      }
    }

    if (!stripeCustomerId) {
      fail('derive.customerId', new Error('no customer id'))
    }

    const clinicName = pickClinicName(input.clinicName ?? null, session!, customer) || 'Clinic'
    const customerEmail =
      typeof session?.customer === 'object' && session?.customer
        ? (session.customer as Stripe.Customer).email ?? undefined
        : undefined
    const rawSessionEmail = (session as { email?: unknown } | null | undefined)?.email
    const sessionEmailValue = typeof rawSessionEmail === 'string' ? rawSessionEmail : undefined
    const effectiveEmail =
      input.pendingSignup?.email ??
      sessionEmailValue ??
      session?.customer_details?.email ??
      customerEmail ??
      input.user?.email ??
      undefined
    const derivedName = input.user?.name ?? customer?.name ?? session?.customer_details?.name ?? null

    let clinicId: string
    try {
      const { data: clinicRow, error: clinicErr } = await db
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

    if (!subscription || !subscription.id) {
      fail('derive.subscription', new Error('missing subscription'))
    }

    const priceId = subscription.items?.data?.[0]?.price?.id ?? null
    const currentPeriodEndIso = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null
    const stripeSubscriptionId = subscription.id
    const status = subscription.status ?? null

    try {
      const { data: subsRow, error: subsErr } = await db
        .from('subscriptions')
        .upsert(
          {
            clinic_id: clinicId,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            price_id: priceId,
            status,
            current_period_end: currentPeriodEndIso,
          },
          { onConflict: 'clinic_id' }
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

    if (input.user?.id) {
      try {
        const username = deriveUsername({
          usernameFromSignup: input.usernameFromSignup ?? null,
          email: effectiveEmail ?? null,
          name: derivedName,
        })

        const { data: profile, error: profileErr } = await db
          .from('profiles')
          .upsert(
            {
              user_id: input.user.id,
              clinic_id: clinicId,
              username,
              email: effectiveEmail ?? null,
            },
            { onConflict: 'user_id' }
          )
          .select()
          .single()

        if (profileErr) {
          fail('db.profiles.upsert', profileErr)
        }

        console.log('[provision] profile.upserted', {
          userId: input.user.id,
          clinicId,
          username,
          email: profile?.email ?? effectiveEmail ?? null,
        })
      } catch (err) {
        fail('db.profiles.upsert.throw', err)
      }
    } else {
      logStage('profiles.skipped.webhook')
    }

    return {
      ok: true,
      clinicId,
      subscriptionId: stripeSubscriptionId,
      currentPeriodEnd: currentPeriodEndIso,
    }
  } catch (error) {
    const plain = toPlainError(error)
    const stage = (error as ProvisionStageError).stage ?? 'unknown'
    const code = (error as ProvisionStageError).code ?? plain.code
    const message = (error as ProvisionStageError).detail ?? plain.message
    return { ok: false, stage, code, message }
  }

  return { ok: false, stage: 'unknown', message: 'Provisioning failed' }
}
