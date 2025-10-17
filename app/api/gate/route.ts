import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { allowAccessBySubStatus } from '@/lib/gate'

export const runtime = 'nodejs'

export async function GET() {
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
  } = await supa.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, reason: 'not_signed_in' }, { status: 401 })
  }

  const result = await allowAccessBySubStatus(user.id)
  return NextResponse.json(result, { status: result.ok ? 200 : 403 })
}
