import { cookies } from 'next/headers'
import PasswordForm from './PasswordForm'
import { getServiceClient } from '@/lib/supabase/clients'

type PasswordPageSearchParams = Promise<{
  state?: string | string[]
}>

export default async function PasswordPage({ searchParams }: { searchParams: PasswordPageSearchParams }) {
  const sp = await searchParams
  let state = Array.isArray(sp.state) ? sp.state[0] ?? '' : sp.state ?? ''
  if (!state) {
    const jar = await cookies()
    state = jar.get('provision.state')?.value ?? ''
  }

  if (!state) {
    return (
      <main className="p-8">
        <p className="text-red-600">Something went wrong locating your checkout session. Please restart sign-up.</p>
      </main>
    )
  }

  const supa = getServiceClient()
  const { data: session, error } = await supa
    .from('provisioning_sessions')
    .select('state,email,username,clinic_name,status,expires_at')
    .eq('state', state)
    .maybeSingle()

  if (error || !session) {
    return (
      <main className="p-8">
        <p className="text-red-600">Unable to load your provisioning details. Please restart sign-up.</p>
      </main>
    )
  }

  const expired = session.expires_at ? new Date(session.expires_at) < new Date() : false
  if (expired) {
    return (
      <main className="p-8">
        <p className="text-red-600">This link has expired. Please restart the checkout process.</p>
      </main>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="mb-1 text-xl font-semibold">Create your password</h1>
        <p className="text-sm text-gray-600">You’ll sign in on the next screen.</p>
      </div>
      <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <p>
          You signed up as <strong>@{session.username}</strong> for <strong>{session.clinic_name}</strong>.
        </p>
        <p>{session.email}</p>
      </div>
      <PasswordForm email={session.email} state={session.state} />
    </div>
  )
}
