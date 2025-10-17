-- Billing & seat leasing schema
create extension if not exists "pgcrypto";

-- ===========================
-- Subscriptions
-- ===========================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'incomplete',
  seat_count integer not null default 1,
  billing_method text not null default 'card',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_subscriptions_clinic on public.subscriptions (clinic_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
for select using (auth.uid() = clinic_id);

-- ===========================
-- Seat leases (concurrent sessions)
-- ===========================
create table if not exists public.seat_leases (
  lease_id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  issued_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists idx_seat_leases_clinic on public.seat_leases (clinic_id);
create index if not exists idx_seat_leases_last_seen on public.seat_leases (clinic_id, last_seen);

alter table public.seat_leases enable row level security;

drop policy if exists "seat_leases_select_clinic" on public.seat_leases;
create policy "seat_leases_select_clinic" on public.seat_leases
for select using (auth.uid() = clinic_id);

drop policy if exists "seat_leases_insert_owner" on public.seat_leases;
create policy "seat_leases_insert_owner" on public.seat_leases
for insert with check (auth.uid() = clinic_id and auth.uid() = user_id);

drop policy if exists "seat_leases_update_owner" on public.seat_leases;
create policy "seat_leases_update_owner" on public.seat_leases
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "seat_leases_delete_owner" on public.seat_leases;
create policy "seat_leases_delete_owner" on public.seat_leases
for delete using (auth.uid() = user_id);

-- ===========================
-- Trigger to maintain updated_at on subscriptions
-- ===========================
create or replace function public.tg_set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_timestamp on public.subscriptions;
create trigger set_timestamp
before update on public.subscriptions
for each row execute function public.tg_set_timestamp();

-- ===========================
-- RPC helpers
-- ===========================
create or replace function public.claim_seat(p_clinic uuid, p_user uuid, p_lease uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  capacity integer;
  active_count integer;
  lease_uuid uuid := coalesce(p_lease, gen_random_uuid());
begin
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;

  if p_user is null or p_clinic is null then
    raise exception 'clinic and user ids are required';
  end if;

  if p_user <> auth.uid() or p_clinic <> auth.uid() then
    raise exception 'cannot claim seat for another user or clinic';
  end if;

  delete from public.seat_leases
  where clinic_id = p_clinic
    and last_seen < (now() - interval '5 minutes');

  select seat_count
    into capacity
  from public.subscriptions
  where clinic_id = p_clinic
    and status in ('active', 'trialing')
  order by current_period_end desc nulls last
  limit 1;

  capacity := greatest(coalesce(capacity, 1), 1);

  select count(*)
    into active_count
  from public.seat_leases
  where clinic_id = p_clinic;

  if capacity <= 0 or active_count >= capacity then
    return false;
  end if;

  begin
    insert into public.seat_leases (lease_id, clinic_id, user_id)
    values (lease_uuid, p_clinic, p_user);
  exception when unique_violation then
    update public.seat_leases
      set user_id = p_user,
          clinic_id = p_clinic
    where lease_id = lease_uuid;
  end;

  update public.seat_leases
    set last_seen = now()
  where lease_id = lease_uuid;

  return true;
end;
$$;

grant execute on function public.claim_seat(p_clinic uuid, p_user uuid, p_lease uuid) to authenticated;

create or replace function public.heartbeat(p_lease uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.seat_leases
    set last_seen = now()
  where lease_id = p_lease
    and user_id = auth.uid();
  return found;
end;
$$;

grant execute on function public.heartbeat(p_lease uuid) to authenticated;

create or replace function public.release_seat(p_lease uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.seat_leases
  where lease_id = p_lease
    and user_id = auth.uid();
  return found;
end;
$$;

grant execute on function public.release_seat(p_lease uuid) to authenticated;
