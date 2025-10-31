import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/clients'

export const runtime = 'nodejs'

type SupportLookupRequest = {
  email?: string
}

export async function POST(req: Request) {
  const expectedToken = process.env.SUPPORT_LOOKUP_TOKEN
  if (!expectedToken) {
    return NextResponse.json({ ok: false, error: 'support_lookup_disabled' }, { status: 503 })
  }

  const header = req.headers.get('authorization') ?? ''
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null

  if (!token || token !== expectedToken) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as SupportLookupRequest | null
  const email = body?.email?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ ok: false, error: 'email_required' }, { status: 400 })
  }

  const db = getServiceClient()

  const profile = await db
    .from('profiles')
    .select('user_id, clinic_id, email, username')
    .ilike('email', email)
    .maybeSingle<{ user_id: string; clinic_id: string | null; email: string | null; username: string | null }>()

  if (profile.error) {
    console.error('[support.lookup] profile query failed', { email, error: profile.error })
    return NextResponse.json({ ok: false, error: 'profile_lookup_failed' }, { status: 500 })
  }

  if (!profile.data) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  const clinicId = profile.data.clinic_id

  let subscriptionStatus: string | null = null
  let currentPeriodEnd: string | null = null
  let priceId: string | null = null

  if (clinicId) {
    const subscription = await db
      .from('subscriptions')
      .select('status, current_period_end, price_id, updated_at, created_at')
      .eq('clinic_id', clinicId)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ status: string | null; current_period_end: string | null; price_id: string | null }>()

    if (subscription.error) {
      console.error('[support.lookup] subscription query failed', {
        email,
        clinicId,
        error: subscription.error,
      })
    } else if (subscription.data) {
      subscriptionStatus = subscription.data.status ?? null
      currentPeriodEnd = subscription.data.current_period_end ?? null
      priceId = subscription.data.price_id ?? null
    }
  }

  let leaseLastSeen: string | null = null
  let leaseRecent = false

  if (clinicId) {
    const lease = await db
      .from('seat_leases')
      .select('last_seen')
      .eq('workspace_id', clinicId)
      .eq('user_id', profile.data.user_id)
      .order('last_seen', { ascending: false })
      .limit(1)
      .maybeSingle<{ last_seen: string | null }>()

    if (lease.error) {
      console.warn('[support.lookup] seat lease query failed', {
        email,
        clinicId,
        error: lease.error,
      })
    } else if (lease.data?.last_seen) {
      leaseLastSeen = lease.data.last_seen
      leaseRecent = new Date(lease.data.last_seen).getTime() >= Date.now() - 2 * 60 * 1000
    }
  }

  const canAccess = subscriptionStatus === 'active'

  return NextResponse.json(
    {
      ok: true,
      email: profile.data.email,
      username: profile.data.username,
      userId: profile.data.user_id,
      clinicId,
      subscriptionStatus,
      currentPeriodEnd,
      priceId,
      entitlements: {
        hasMembership: Boolean(clinicId),
        canExportHandouts: canAccess,
        canAccessBranding: canAccess,
        leaseRecent,
        leaseLastSeen,
      },
    },
    { status: 200 }
  )
}
