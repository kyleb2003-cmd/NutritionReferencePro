import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
export const LOOKUP_SINGLE = process.env.STRIPE_LOOKUP_SINGLE!

const cache = new Map<string, string>()

export async function priceId(lookupKey: string) {
  const cached = cache.get(lookupKey)
  if (cached) return cached
  const res = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  if (!res.data.length) throw new Error(`Missing Stripe price for ${lookupKey}`)
  const id = res.data[0].id
  cache.set(lookupKey, id)
  return id
}
