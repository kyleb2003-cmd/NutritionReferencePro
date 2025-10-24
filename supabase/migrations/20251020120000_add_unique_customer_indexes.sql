alter table public.clinics
  add column if not exists stripe_customer_id text;

create unique index if not exists clinics_stripe_customer_id_key
  on public.clinics(stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.subscriptions
  add column if not exists price_id text;

create unique index if not exists subscriptions_stripe_customer_id_key
  on public.subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;
