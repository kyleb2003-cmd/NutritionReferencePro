# NutritionReferencePro

SaaS platform built with Next.js, Supabase, and @react-pdf/renderer for generating customizable, evidence-based nutrition handouts for health clinics.

---

This project is a [Next.js](https://nextjs.org) app bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

## Environment variables

Create `.env.local` (and configure the same keys in Vercel) with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_LOOKUP_SINGLE=nrp_seat_single_monthly_49
NEXT_PUBLIC_BILLING_MODE=card                        # or invoice
```

### Stripe setup

Create a single recurring monthly Price in Stripe ($49/mo) and assign it the lookup key from `STRIPE_LOOKUP_SINGLE`.

Store the Webhook secret from `stripe listen` in `STRIPE_WEBHOOK_SECRET`. The app uses Stripe Checkout for card payments and generates draft invoices for institutional billing.
