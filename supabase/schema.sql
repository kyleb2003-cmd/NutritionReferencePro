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
