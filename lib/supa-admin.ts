import { createClient } from '@supabase/supabase-js'

export function admin() {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE
  if (!serviceRole) {
    throw new Error('Missing Supabase service role key for admin client')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRole,
    { auth: { persistSession: false } }
  )
}
