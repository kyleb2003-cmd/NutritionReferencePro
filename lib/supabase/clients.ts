import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE

if (!SUPABASE_SERVICE_ROLE) {
  throw new Error('Missing Supabase service role key for server client')
}

export async function getSsrClient() {
  const cookieStore = await cookies()
  const mutableStore = cookieStore as unknown as {
    get(name: string): { value: string } | undefined
    set(options: { name: string; value: string } & Partial<CookieOptions>): void
  }

  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      get(name: string) {
        return mutableStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        mutableStore.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        mutableStore.set({ name, value: '', ...options, maxAge: -1 })
      },
    },
  })
}

export function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
