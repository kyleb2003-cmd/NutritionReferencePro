const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY

export type AuthAdminUser = { id: string; email?: string | null }

export async function getUserByEmailViaAdmin(email: string): Promise<AuthAdminUser | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing Supabase admin environment variables')
  }

  const url = new URL('/auth/v1/admin/users', SUPABASE_URL)
  url.searchParams.set('email', email)

  const resp = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
    },
    cache: 'no-store',
  })

  if (!resp.ok) {
    return null
  }

  const raw = await resp.json()
  const list: AuthAdminUser[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.users)
    ? raw.users
    : []
  return list.find((user) => (user.email ?? '').toLowerCase() === email.toLowerCase()) ?? null
}
