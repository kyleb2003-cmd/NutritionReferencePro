import type Stripe from 'stripe'
import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { provisionFromStripe } from '@/lib/billing/provision'

export const runtime = 'nodejs'

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>

export default async function PostCheckoutPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const sp = await searchParams
  const sessionId = (sp.session_id as string) || ''
  if (!sessionId) {
    console.error('[post-checkout] missing session_id')
    redirect('/sign-up')
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['customer', 'subscription', 'subscription.items.data.price'],
  })
  const email =
    session.customer_details?.email ||
    (typeof session.customer === 'object' && session.customer && !('deleted' in session.customer)
      ? (session.customer as Stripe.Customer).email
      : undefined)
  const customerId = resolveCustomerIdFromSession(session)
  const subscription = session.subscription && typeof session.subscription !== 'string' ? session.subscription : null
  const pendingId = session.client_reference_id ?? null
  const clinicNameMeta =
    session.metadata && typeof session.metadata.clinic_name === 'string' && session.metadata.clinic_name.trim()
      ? session.metadata.clinic_name.trim()
      : null
  const preferredUsername =
    session.metadata && typeof session.metadata.username === 'string' && session.metadata.username.trim()
      ? session.metadata.username.trim()
      : null
  const hasProvisionError = sp.provision_error === '1'

  if (!email || !customerId) {
    return (
      <main className="p-8">
        <p className="text-red-600">Missing checkout details. Please contact support.</p>
      </main>
    )
  }

  const safeEmail = email.toLowerCase()
  if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
    return (
      <main className="p-8">
        <p className="text-yellow-700">Payment is processing. You’ll be able to set your password once it’s active.</p>
      </main>
    )
  }

  async function provision(formData: FormData) {
    'use server'
    const password = String(formData.get('password') || '')
    if (!password) {
      throw new Error('Password required')
    }

    const cookieStore = await cookies()
    const supaServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    const supaAdmin = createAdminClient()

    try {
      const desiredUsername = preferredUsername || safeEmail.split('@')[0]
      const {
        data: { user: existingUser },
      } = await supaServer.auth.getUser()

      let finalUser: User | null = existingUser ?? null
      let userId = finalUser?.id ?? null
      if (!userId) {
        const created = await supaAdmin.auth.admin.createUser({
          email: safeEmail,
          password,
          email_confirm: true,
          user_metadata: desiredUsername ? { username: desiredUsername } : undefined,
        })
        const already =
          !!created.error &&
          (created.error.status === 422 || /already/i.test(created.error.message || ''))

        if (created.error && !already) {
          throw created.error
        }

        if (!already) {
          finalUser = created.data?.user ?? null
          userId = finalUser?.id ?? null
        } else {
          const lookup = await supaAdmin.auth.admin.listUsers({ page: 1, perPage: 100 })
          const matched = lookup.data?.users?.find((u) => u.email?.toLowerCase() === safeEmail) ?? null
          userId = matched?.id ?? null
          finalUser = (matched as User | null) ?? finalUser
          if (userId) {
            await supaAdmin.auth.admin.updateUserById(userId, {
              password,
              user_metadata: desiredUsername
                ? { ...(matched?.user_metadata ?? {}), username: desiredUsername }
                : undefined,
            })
          } else {
            throw new Error('Unable to resolve user for provisioning')
          }
        }

      } else {
        await supaAdmin.auth.admin.updateUserById(userId, { password })
      }

      const signIn = await supaServer.auth.signInWithPassword({ email: safeEmail, password })
      if (signIn.error) {
        throw signIn.error
      }
      if (signIn.data.user) {
        finalUser = signIn.data.user
        userId = signIn.data.user.id
      } else if (!finalUser) {
        const {
          data: { user: refreshedUser },
        } = await supaServer.auth.getUser()
        finalUser = refreshedUser
      }

      if (!userId) {
        throw new Error('Missing user after sign-in')
      }

      if (finalUser) {
        const metadata = { ...(finalUser.user_metadata ?? {}) }
        if (desiredUsername && metadata.username !== desiredUsername) {
          await supaAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { ...metadata, username: desiredUsername },
          })
          finalUser = {
            ...finalUser,
            user_metadata: { ...metadata, username: desiredUsername },
          }
        }
      }

      await provisionFromStripe({
        sessionId,
        session,
        clinicName: clinicNameMeta,
        user: finalUser,
      })

      if (pendingId) {
        await supaAdmin.from('pending_signups').delete().eq('id', pendingId)
      }

      redirect('/dashboard')
    } catch (error) {
      logProvisionError(error)
      redirect(`/post-checkout?session_id=${encodeURIComponent(sessionId)}&provision_error=1`)
    }
  }

  return (
    <main className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2">Set your password</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Email (for billing): <strong>{email}</strong>
      </p>
      {hasProvisionError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Provisioning hit a snag. Please try again.
        </div>
      ) : null}
      <form action={provision} className="space-y-3">
        <label className="block">
          <span className="text-sm">Password</span>
          <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <button className="rounded-md bg-black px-4 py-2 text-white">
          {hasProvisionError ? 'Try again' : 'Create account'}
        </button>
      </form>
    </main>
  )
}

function resolveCustomerIdFromSession(session: Stripe.Checkout.Session): string | null {
  if (typeof session.customer === 'string') return session.customer
  if (session.customer && !('deleted' in session.customer)) {
    return session.customer.id
  }
  return null
}

function logProvisionError(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    console.error('[post-checkout] provisioning error', error)
  } else {
    console.error('[post-checkout] provisioning error', error)
  }
}
