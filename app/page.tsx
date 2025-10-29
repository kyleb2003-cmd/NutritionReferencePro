// app/post-checkout/page.tsx
import { redirect } from 'next/navigation'
import { getSsrClient } from '@/lib/supabase/clients'
import { provisionFromStripe } from '@/lib/billing/provision'

// Make searchParams async (Next.js 15 “sync dynamic apis” change)
type PostCheckoutSearchParams = Promise<{
  session_id?: string
  provision_error?: string
}>

export default async function PostCheckoutPage({
  searchParams,
}: {
  searchParams: PostCheckoutSearchParams
}) {
  const { session_id: sessionId, provision_error } = await searchParams
  if (!sessionId) {
    console.error('[post-checkout] missing session_id')
    redirect('/sign-up')
  }

  const hasProvisionError = provision_error === '1'

  // Render the password form on GET; process on POST via server action
  async function provision(formData: FormData) {
    'use server'
    const supaServer = getSsrClient()

    try {
      const password = String(formData.get('password') ?? '').trim()
      if (!password) {
        throw new Error('Missing password')
      }

      // Provision (clinic + subscription + profile). This function should
      // also return the customer's email/name from Stripe checkout.session.
      const result = await provisionFromStripe({
        sessionId: sessionId!,
      })

      if (!result.ok) {
        console.error('[post-checkout] provisioning action failed', result)
        throw new Error(`Provisioning failed (${result.stage})`)
      }

      // After provisioning, sign the user in using SSR client, which writes cookies.
      const safeEmail = result.email
      if (!safeEmail) {
        throw new Error('Missing email after provisioning')
      }

      const { error: signInErr } = await supaServer.auth.signInWithPassword({
        email: safeEmail,
        password,
      })
      if (signInErr) {
        throw signInErr
      }

      redirect('/dashboard')
    } catch (error) {
      console.error('[post-checkout] provisioning error', error)
      // Bounce back to show the “snag” message but keep session_id in URL
      redirect(`/post-checkout?session_id=${encodeURIComponent(sessionId!)}&provision_error=1`)
    }
  }

  return (
    <form action={provision} className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Set your password</h1>
      {hasProvisionError ? (
        <p className="text-red-600">
          Provisioning hit a snag. Please try again.
        </p>
      ) : null}
      <input
        name="password"
        type="password"
        required
        placeholder="Choose a password"
        className="input input-bordered w-full"
      />
      <button type="submit" className="btn btn-primary w-full">
        Continue
      </button>
    </form>
  )
}
