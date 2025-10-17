import { admin } from '@/lib/supa-admin'

export async function allowAccessBySubStatus(userId: string) {
  const supa = admin()
  const prof = await supa.from('profiles').select('clinic_id').eq('user_id', userId).maybeSingle()
  const clinicId = prof.data?.clinic_id ?? null
  let cid = clinicId
  if (!cid) {
    const cu = await supa.from('clinic_users').select('clinic_id').eq('user_id', userId).maybeSingle()
    cid = cu.data?.clinic_id ?? null
  }
  if (!cid) return { ok: false, reason: 'no_clinic' }

  const sub = await supa.from('subscriptions').select('status').eq('clinic_id', cid).maybeSingle()
  const status = sub.data?.status ?? null
  const ok = status ? ['active', 'trialing'].includes(status) : false
  return { ok, reason: ok ? null : status ?? 'missing_subscription' }
}
