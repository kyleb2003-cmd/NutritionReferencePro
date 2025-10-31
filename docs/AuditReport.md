# Audit Report

| Scope | Status | Notes |
| --- | --- | --- |
| 1) RLS & RPC permissions | PASS | Verified `public.get_entitlements()` is `SECURITY DEFINER`, search path locked to `public`, and now raises `42501` when no clinic membership (`supabase/migrations/20251101090000_update_get_entitlements.sql`). |
| 2) Subscription → DB coverage | PASS | Webhook now mirrors Stripe updates for checkout, subscription lifecycle, and invoice success/failure while logging `[stripe.subscription.sync]` (`app/api/stripe/webhook/route.ts`). |
| 3) Profile/clinic invariant | PASS | Login flow auto-links clinics via `/api/workspace/ensure` so dashboards receive a real `clinicId` before mounts (`components/AuthGate.tsx`, `app/api/workspace/ensure/route.ts`). |
| 4) Seat lease resilience | PASS | Seat claim keeps neutral loading and logs `[seat.claim]` while cleanup + TTL remain in `claim_seat` (reviewed `components/AuthGate.tsx`, Supabase migrations). |
| 5) UI gates | PASS | Export/branding gates rely solely on normalized entitlements with loading placeholders; IBS preview stays read-only (`app/dashboard/condition/[slug]/page.tsx`, `app/dashboard/branding/page.tsx`, `app/preview/ibs/page.tsx`). |
| 6) Observability | PASS | Added positive seat-claim log, entitlements fetch warnings already in place, and subscription sync logging confirmed (`components/AuthGate.tsx`, `components/EntitlementsProvider.tsx`, `app/api/stripe/webhook/route.ts`). |
| 7) Support ergonomics (MVP) | PASS | Introduced token-gated lookup API + helper page exposing clinic, subscription, entitlements, and lease freshness for support audits (`app/api/support/lookup/route.ts`, `app/support/lookup/page.tsx`). |
