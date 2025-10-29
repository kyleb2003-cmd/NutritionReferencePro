'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServiceClient } from '@/lib/supabase/clients'
import { getUserByEmailViaAdmin } from '@/lib/supabase/auth-admin'
import { provisionFromStripe } from '@/lib/billing/provision'

type ProvisioningRow = {
  state: string
  email: string
  username: string
  clinic_name: string
  stripe_session_id: string | null
  supabase_user_id: string | null
  expires_at: string | null
}

function isNextRedirectDigest(error: unknown): error is { digest: string } {
  if (typeof error !== 'object' || error === null) return false
  if (!('digest' in error)) return false
  const digest = (error as { digest: unknown }).digest
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')
}

export async function setPasswordAction(formData: FormData) {
  const pw = String(formData.get('password') || '')
  const pw2 = String(formData.get('confirm') || '')
  const emailFromForm = (formData.get('email') as string | null) || undefined
  const state = String(formData.get('state') || '')

  if (pw.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' }
  if (pw !== pw2) return { ok: false, message: 'Passwords do not match.' }
  if (!state) return { ok: false, message: 'Missing provisioning state. Please restart checkout.' }

  const supa = getServiceClient()
  const { data: provisioning, error } = await supa
    .from('provisioning_sessions')
    .select<ProvisioningRow>('state,email,username,clinic_name,stripe_session_id,supabase_user_id,expires_at')
    .eq('state', state)
    .maybeSingle()

  if (error || !provisioning) {
    return { ok: false, message: 'Provisioning session not found. Please restart checkout.' }
  }

  const expired = provisioning.expires_at ? new Date(provisioning.expires_at) < new Date() : false
  if (expired) {
    return { ok: false, message: 'This link has expired. Please restart checkout.' }
  }

  let uid: string | null = provisioning.supabase_user_id
  const email = emailFromForm || provisioning.email

  if (!uid && email) {
    const resolved = await getUserByEmailViaAdmin(email)
    if (resolved?.id) {
      uid = resolved.id
      await supa.from('provisioning_sessions').update({ supabase_user_id: uid }).eq('state', state)
    }
  }

  if (!uid) {
    return { ok: false, message: 'Missing user id and unable to resolve by email. Please restart checkout.' }
  }

  const admin = createAdminClient()
  const { error: updateError } = await admin.auth.admin.updateUserById(uid, { password: pw })
  if (updateError) return { ok: false, message: updateError.message }

  if (!provisioning.stripe_session_id) {
    return { ok: false, message: 'Missing Stripe session. Please restart checkout.' }
  }

  const provisionResult = await provisionFromStripe({
    sessionId: provisioning.stripe_session_id,
    user: { id: uid, email: email ?? undefined, name: null },
    usernameFromSignup: provisioning.username,
    pendingSignup: { email },
  })

  if (!provisionResult.ok) {
    return { ok: false, message: provisionResult.message ?? 'Provisioning failed. Please contact support.' }
  }

  await supa.from('provisioning_sessions').update({ status: 'password_set' }).eq('state', state)

  const jar = await cookies()
  jar.delete('provision.state')

  try {
    redirect(`/post-checkout/sign-in?state=${encodeURIComponent(state)}`)
  } catch (err) {
    if (isNextRedirectDigest(err)) {
      throw err
    }
    return { ok: false, message: 'Redirect failed' }
  }
}
