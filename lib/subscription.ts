import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'incomplete'
  | 'past_due'
  | 'canceled'
  | 'unpaid'

export type SubscriptionRow = {
  id: string
  clinic_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  seat_count: number
  billing_method: 'card' | 'invoice'
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export async function getActiveSubscription(clinicId: string): Promise<SubscriptionRow | null> {
  if (!clinicId) return null
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('clinic_id', clinicId)
    .in('status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>()

  if (error) {
    console.error('getActiveSubscription error', error)
    return null
  }
  return data ?? null
}

export async function upsertSubscription(values: Partial<SubscriptionRow> & { clinic_id: string }) {
  const payload = {
    seat_count: 1,
    status: 'incomplete',
    billing_method: 'card',
    ...values,
  }

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(payload, { onConflict: 'clinic_id' })
    .select('*')
    .maybeSingle<SubscriptionRow>()

  if (error) {
    throw error
  }

  return data ?? null
}
