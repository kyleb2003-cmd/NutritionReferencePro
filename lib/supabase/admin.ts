import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const rawServiceRole = process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY

if (!rawUrl || !rawServiceRole) {
  throw new Error('Missing Supabase admin environment variables')
}

const SUPABASE_URL = rawUrl
const SUPABASE_SERVICE_ROLE = rawServiceRole

export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'NRP-Admin' } },
  })
}

export const supabaseAdmin = createAdminClient()
