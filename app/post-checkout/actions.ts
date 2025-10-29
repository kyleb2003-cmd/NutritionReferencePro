'use server'

import { provisionFromStripe } from '@/lib/billing/provision'

export type ProvisionActionInput = {
  sessionId: string
  user?: { id: string; email?: string; name?: string | null } | null
  usernameFromSignup?: string | null
  pendingSignup?: { email?: string | null } | null
}

export type ProvisionActionResult =
  | {
      ok: true
      clinicId: string
      subscriptionId: string
      currentPeriodEnd: string | null
      email: string | null
    }
  | { ok: false; stage: string; code?: string; message: string }

/**
 * Server action wrapper that guarantees only plain JSON leaves the server.
 * It never returns Stripe or Supabase client instances and never throws with rich "cause".
 */
export async function provisionAction(input: ProvisionActionInput): Promise<ProvisionActionResult> {
  const res = await provisionFromStripe({
    sessionId: input.sessionId,
    user: input.user ?? null,
    usernameFromSignup: input.usernameFromSignup ?? null,
    pendingSignup: input.pendingSignup ?? null,
  })

  // provisionFromStripe MUST already return a plain object; we re-check here for safety.
  return JSON.parse(JSON.stringify(res))
}
