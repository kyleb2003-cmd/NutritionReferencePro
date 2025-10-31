import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase/clients'

export const runtime = 'nodejs'

export async function POST() {
  const cookieStore = await cookies()
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await supa.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ ok: false, reason: 'not_signed_in' }, { status: 401 })
  }

  const db = getServiceClient()

  const { data: profileRow, error: profileError } = await db
    .from('profiles')
    .select('user_id, clinic_id, username, email')
    .eq('user_id', user.id)
    .maybeSingle<{ user_id: string; clinic_id: string | null; username: string | null; email: string | null }>()

  if (profileError) {
    console.warn('[workspace.ensure] profile lookup failed', { userId: user.id, error: profileError })
    return NextResponse.json({ ok: false, reason: 'profile_lookup_failed' }, { status: 500 })
  }

  const normalizedUsername = profileRow?.username?.trim() || null
  const normalizedEmail = profileRow?.email?.trim() || user.email?.trim() || null

  const ensureUsername =
    normalizedUsername ||
    (normalizedEmail ? normalizedEmail.split('@')[0] : null) ||
    user.user_metadata?.full_name?.toString().split(/\s+/)[0] ||
    `user_${user.id.slice(0, 8)}`

  if (!profileRow) {
    const { error: insertProfileError } = await db.from('profiles').insert({
      user_id: user.id,
      username: ensureUsername,
      email: normalizedEmail,
    })

    if (insertProfileError) {
      console.warn('[workspace.ensure] profile insert failed', {
        userId: user.id,
        error: insertProfileError,
      })
      return NextResponse.json({ ok: false, reason: 'profile_insert_failed' }, { status: 500 })
    }
  }

  let clinicId = profileRow?.clinic_id ?? null

  if (!clinicId) {
    const clinicNameSource =
      profileRow?.username?.trim() ||
      profileRow?.email?.trim() ||
      user.user_metadata?.full_name?.toString().trim() ||
      user.email?.trim() ||
      'Clinic'

    const clinicPayload = {
      id: user.id,
      clinic_name: clinicNameSource,
    }

    const { data: clinic, error: clinicError } = await db
      .from('clinics')
      .upsert(clinicPayload, { onConflict: 'id' })
      .select('id')
      .single<{ id: string }>()

    if (clinicError || !clinic?.id) {
      console.warn('[workspace.ensure] clinic upsert failed', {
        userId: user.id,
        error: clinicError,
      })
      return NextResponse.json({ ok: false, reason: 'clinic_upsert_failed' }, { status: 500 })
    }

    clinicId = clinic.id

    const { error: profileUpsertError } = await db
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          clinic_id: clinicId,
          username: ensureUsername,
          email: normalizedEmail,
        },
        { onConflict: 'user_id' }
      )

    if (profileUpsertError) {
      console.warn('[workspace.ensure] profile upsert failed', {
        userId: user.id,
        error: profileUpsertError,
      })
      return NextResponse.json({ ok: false, reason: 'profile_upsert_failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, clinicId }, { status: 200 })
}
