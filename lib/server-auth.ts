import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

class AuthenticatedRequestError extends Error {
  statusCode = 401
}

export type AuthenticatedContext = {
  userId: string
  clinicId: string | null
  email: string | null

  getClinicIdOrThrow(): string
}

export async function requireAuthContext(request: NextRequest): Promise<AuthenticatedContext> {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    throw new AuthenticatedRequestError('Missing bearer token')
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    throw new AuthenticatedRequestError('Invalid bearer token')
  }

  const user = data.user
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('clinic_id')
    .eq('user_id', user.id)
    .maybeSingle<{ clinic_id: string | null }>()

  const clinicId = profile?.clinic_id ?? null

  return {
    userId: user.id,
    clinicId,
    email: user.email ?? null,
    getClinicIdOrThrow() {
      if (!clinicId) {
        throw new AuthenticatedRequestError('No clinic linked to user')
      }
      return clinicId
    },
  }
}

export function isAuthError(error: unknown): error is AuthenticatedRequestError {
  return error instanceof AuthenticatedRequestError
}
