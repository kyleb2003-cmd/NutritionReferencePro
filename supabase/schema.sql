-- ===========================
-- Storage: private 'branding' bucket
-- ===========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  false,
  5 * 1024 * 1024,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ===========================
-- Tables
-- ===========================

-- Clinics (one user per clinic) – primary key equals auth.uid()
create table if not exists public.clinics (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_name text not null default '',
  footer_text text not null default '',
  logo_path text,                      -- e.g. branding/<uid>/logo.png
  updated_at timestamp with time zone not null default now()
);

-- Taxonomy: groups (e.g., Gastrointestinal)
create table if not exists public.groups (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique
);

-- Conditions (e.g., IBS), belongs to a group
create table if not exists public.conditions (
  id bigint generated always as identity primary key,
  group_id bigint not null references public.groups(id) on delete cascade,
  name text not null,
  slug text not null unique
);

-- Condition content (Markdown text fields)
create table if not exists public.condition_content (
  id bigint generated always as identity primary key,
  condition_id bigint not null references public.conditions(id) on delete cascade,
  overview text,
  mealplan_1400 text,
  mealplan_1800 text,
  mealplan_2200 text,
  mealplan_2600 text,
  shopping_list text,
  rd_referral text
);

create index if not exists idx_conditions_group on public.conditions(group_id);
create index if not exists idx_condition_content_condition on public.condition_content(condition_id);

-- ===========================
-- Row Level Security & Policies
-- ===========================
alter table public.clinics enable row level security;
alter table public.groups enable row level security;
alter table public.conditions enable row level security;
alter table public.condition_content enable row level security;

-- Clinics: users can read & write only their own row
drop policy if exists "clinics_select_own" on public.clinics;
create policy "clinics_select_own" on public.clinics
for select using (auth.uid() = id);

drop policy if exists "clinics_upsert_own" on public.clinics;
create policy "clinics_upsert_own" on public.clinics
for insert with check (auth.uid() = id);

drop policy if exists "clinics_update_own" on public.clinics;
create policy "clinics_update_own" on public.clinics
for update using (auth.uid() = id);

-- Content & taxonomy: read-only for all authenticated users
drop policy if exists "groups_read_all_auth" on public.groups;
create policy "groups_read_all_auth" on public.groups
for select using (auth.role() = 'authenticated');

drop policy if exists "conditions_read_all_auth" on public.conditions;
create policy "conditions_read_all_auth" on public.conditions
for select using (auth.role() = 'authenticated');

drop policy if exists "content_read_all_auth" on public.condition_content;
create policy "content_read_all_auth" on public.condition_content
for select using (auth.role() = 'authenticated');

-- No insert/update/delete policies on groups/conditions/condition_content
-- so only service_role (server/admin) can write.

-- Read: allow users to read their own files by prefix "<uid>/"
drop policy if exists "branding_read_own" on storage.objects;
create policy "branding_read_own" on storage.objects
for select using (
  bucket_id = 'branding'
  and auth.role() = 'authenticated'
  and name like auth.uid()::text || '/%'
);

-- Write: allow users to write/delete only within their "<uid>/" folder
drop policy if exists "branding_write_own" on storage.objects;
create policy "branding_write_own" on storage.objects
for insert with check (
  bucket_id = 'branding'
  and auth.role() = 'authenticated'
  and name like auth.uid()::text || '/%'
);

drop policy if exists "branding_update_own" on storage.objects;
create policy "branding_update_own" on storage.objects
for update using (
  bucket_id = 'branding'
  and auth.role() = 'authenticated'
  and name like auth.uid()::text || '/%'
);

drop policy if exists "branding_delete_own" on storage.objects;
create policy "branding_delete_own" on storage.objects
for delete using (
  bucket_id = 'branding'
  and auth.role() = 'authenticated'
  and name like auth.uid()::text || '/%'
);

-- ===========================
-- (Optional) Seed minimal taxonomy example
-- ===========================
insert into public.groups (name, slug)
  values ('Gastrointestinal', 'gastrointestinal')
  on conflict (slug) do nothing;

insert into public.conditions (group_id, name, slug)
  select g.id, 'Irritable Bowel Syndrome (IBS)', 'ibs' from public.groups g where g.slug='gastrointestinal'
  on conflict (slug) do nothing;

insert into public.condition_content (condition_id, overview)
  select c.id, 'Markdown overview for IBS goes here.' from public.conditions c where c.slug='ibs'
  on conflict do nothing;

-- ===========================
-- Subscriptions & seat leases
-- ===========================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'incomplete',
  seat_count integer not null default 1,
  billing_method text not null default 'card',
  current_period_end timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create unique index if not exists idx_subscriptions_clinic on public.subscriptions(clinic_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
for select using (auth.uid() = clinic_id);

create table if not exists public.seat_leases (
  lease_id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  issued_at timestamp with time zone not null default now(),
  last_seen timestamp with time zone not null default now()
);

create index if not exists idx_seat_leases_clinic on public.seat_leases(clinic_id);
create index if not exists idx_seat_leases_last_seen on public.seat_leases(clinic_id, last_seen);

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
