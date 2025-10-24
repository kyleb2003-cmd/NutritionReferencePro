import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServiceClient } from '@/lib/supabase/clients'
import { getUserByEmailViaAdmin } from '@/lib/supabase/auth-admin'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.redirect(new URL('/post-checkout/error?m=missing_session', url), 307)
  }

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    })
  } catch {
    return NextResponse.redirect(new URL('/post-checkout/error?m=session_lookup_failed', url), 307)
  }

  const email =
    session.customer_details?.email ||
    (typeof session.customer === 'object' && session.customer && !('deleted' in session.customer)
      ? (session.customer.email as string | null | undefined)
      : undefined) ||
    session.customer_email ||
    undefined

  if (!email) {
    return NextResponse.redirect(new URL('/post-checkout/error?m=no_email', url), 307)
  }

  const state =
    session.client_reference_id ||
    (session.metadata && typeof session.metadata.state === 'string' ? session.metadata.state : null)
  if (!state) {
    return NextResponse.redirect(new URL('/post-checkout/error?m=missing_state', url), 307)
  }

  const db = getServiceClient()
  const { data: provisioning, error: provisioningError } = await db
    .from('provisioning_sessions')
    .select('*')
    .eq('state', state)
    .maybeSingle()

  let provisioningRow = provisioning
  if (provisioningError) {
    return NextResponse.redirect(new URL('/post-checkout/error?m=provision_lookup_failed', url), 307)
  }

  if (!provisioningRow) {
    const metaUsername =
      typeof session.metadata?.username === 'string' && session.metadata.username.trim()
        ? session.metadata.username.trim()
        : email.split('@')[0]
    const metaClinic =
      typeof session.metadata?.clinic_name === 'string' && session.metadata.clinic_name.trim()
        ? session.metadata.clinic_name.trim()
        : 'Clinic'
    const { data: inserted, error: insertErr } = await db
      .from('provisioning_sessions')
      .insert({
        state,
        email: email.toLowerCase(),
        username: metaUsername,
        clinic_name: metaClinic,
        stripe_session_id: sessionId,
      })
      .select('*')
      .single()

    if (insertErr || !inserted) {
      return NextResponse.redirect(new URL('/post-checkout/error?m=provision_insert_failed', url), 307)
    }
    provisioningRow = inserted
  }

  const admin = createAdminClient()

  let userId = provisioningRow.supabase_user_id ?? null
  if (!userId) {
    const existing = await getUserByEmailViaAdmin(provisioningRow.email)
    if (existing?.id) {
      userId = existing.id
    }
  }

  if (!userId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: provisioningRow.email,
      email_confirm: true,
    })
    if (createErr || !created?.user?.id) {
      return NextResponse.redirect(new URL('/post-checkout/error?m=admin_create_failed', url), 307)
    }
    userId = created.user.id
  }

  await db
    .from('provisioning_sessions')
    .update({
      stripe_session_id: sessionId,
      supabase_user_id: userId,
      status: 'user_ensured',
    })
    .eq('state', state)

  const jar = await cookies()
  const secure = process.env.NODE_ENV === 'production'
  jar.set('provision.state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 15 * 60,
    path: '/',
  })

  const redirectUrl = new URL('/post-checkout/password', url)
  redirectUrl.searchParams.set('state', state)
  return NextResponse.redirect(redirectUrl, 307)
}
