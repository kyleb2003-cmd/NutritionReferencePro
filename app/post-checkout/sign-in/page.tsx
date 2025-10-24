import { getServiceClient } from '@/lib/supabase/clients'
import SignInForm from './SignInForm'

type SearchParams = Promise<{
  state?: string | string[]
}>

export default async function PostCheckoutSignIn({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const state = Array.isArray(sp.state) ? sp.state[0] ?? '' : sp.state ?? ''

  if (!state) {
    return (
      <main className="p-8">
        <p className="text-red-600">Missing provisioning state. Please restart the checkout process.</p>
      </main>
    )
  }

  const supa = getServiceClient()
  const { data, error } = await supa
    .from('provisioning_sessions')
    .select('state,email,username,clinic_name,status,expires_at')
    .eq('state', state)
    .maybeSingle()

  if (error || !data) {
    return (
      <main className="p-8">
        <p className="text-red-600">We couldn&rsquo;t find your checkout session. Please try signing up again.</p>
      </main>
    )
  }

  const expired = data.expires_at ? new Date(data.expires_at) < new Date() : false
  if (expired) {
    return (
      <main className="p-8">
        <p className="text-red-600">This link has expired. Please restart checkout.</p>
      </main>
    )
  }

  if (data.status !== 'password_set') {
    return (
      <main className="p-8">
        <p className="text-red-600">Please set your password before signing in.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Sign in to finish setup</h1>
        <p className="text-sm text-gray-600">Use the password you just created to access your dashboard.</p>
      </div>
      <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <p>
          Username: <strong>@{data.username}</strong>
        </p>
        <p>Clinic: {data.clinic_name}</p>
        <p>Email: {data.email}</p>
      </div>
      <SignInForm email={data.email} username={data.username} />
    </main>
  )
}
