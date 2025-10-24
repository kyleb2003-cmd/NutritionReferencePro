-- Ensure pgcrypto is available for UUID generation
create extension if not exists pgcrypto with schema public;

-- Normalize seat_leases schema (idempotent)
create table if not exists public.seat_leases (
  lease_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  expires_at timestamptz
);

-- Backfill/rename legacy columns if an earlier schema exists
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_leases'
      and column_name = 'lease_id'
  ) then
    null;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_leases'
      and column_name = 'id'
  ) then
    execute 'alter table public.seat_leases rename column id to lease_id';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_leases'
      and column_name = 'clinic_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_leases'
      and column_name = 'workspace_id'
  ) then
    execute 'alter table public.seat_leases rename column clinic_id to workspace_id';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_leases'
      and column_name = 'issued_at'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_leases'
      and column_name = 'created_at'
  ) then
    execute 'alter table public.seat_leases rename column issued_at to created_at';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_leases'
      and column_name = 'last_seen'
  ) then
    execute 'alter table public.seat_leases add column last_seen timestamptz not null default now()';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_leases'
      and column_name = 'created_at'
  ) then
    execute 'alter table public.seat_leases add column created_at timestamptz not null default now()';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_leases'
      and column_name = 'workspace_id'
  ) then
    execute 'alter table public.seat_leases add column workspace_id uuid not null';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seat_leases'
      and column_name = 'user_id'
  ) then
    execute 'alter table public.seat_leases add column user_id uuid not null';
  end if;
end$$;

-- Maintain NOT NULL guarantees
alter table public.seat_leases
  alter column workspace_id set not null,
  alter column user_id set not null,
  alter column created_at set not null,
  alter column last_seen set not null;

-- Optional foreign key to clinics/workspaces table when available
do $$
begin
  if to_regclass('public.clinics') is not null then
    if not exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'seat_leases' and c.conname = 'seat_leases_workspace_id_fkey'
    ) then
      execute 'alter table public.seat_leases
        add constraint seat_leases_workspace_id_fkey
        foreign key (workspace_id) references public.clinics(id) on delete cascade';
    end if;
  elsif to_regclass('public.workspaces') is not null then
    if not exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'seat_leases' and c.conname = 'seat_leases_workspace_id_fkey'
    ) then
      execute 'alter table public.seat_leases
        add constraint seat_leases_workspace_id_fkey
        foreign key (workspace_id) references public.workspaces(id) on delete cascade';
    end if;
  elsif to_regclass('public.organizations') is not null then
    if not exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'seat_leases' and c.conname = 'seat_leases_workspace_id_fkey'
    ) then
      execute 'alter table public.seat_leases
        add constraint seat_leases_workspace_id_fkey
        foreign key (workspace_id) references public.organizations(id) on delete cascade';
    end if;
  elsif to_regclass('public.teams') is not null then
    if not exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'seat_leases' and c.conname = 'seat_leases_workspace_id_fkey'
    ) then
      execute 'alter table public.seat_leases
        add constraint seat_leases_workspace_id_fkey
        foreign key (workspace_id) references public.teams(id) on delete cascade';
    end if;
  end if;
end$$;

-- Always ensure FK to auth.users
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'seat_leases' and c.conname = 'seat_leases_user_id_fkey'
  ) then
    execute 'alter table public.seat_leases
      add constraint seat_leases_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade';
  end if;
end$$;

-- Uniqueness: one lease per workspace + user
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'seat_leases_workspace_user_uidx'
  ) then
    execute 'create unique index seat_leases_workspace_user_uidx
      on public.seat_leases (workspace_id, user_id)';
  end if;
end$$;

-- Helpful indexes for cleanup/queries
create index if not exists idx_seat_leases_workspace on public.seat_leases (workspace_id);
create index if not exists idx_seat_leases_last_seen on public.seat_leases (workspace_id, last_seen);

-- Enable RLS and reset legacy policies
alter table public.seat_leases enable row level security;

drop policy if exists "seat_leases_select_clinic" on public.seat_leases;
drop policy if exists "seat_leases_insert_owner" on public.seat_leases;
drop policy if exists "seat_leases_update_owner" on public.seat_leases;
drop policy if exists "seat_leases_delete_owner" on public.seat_leases;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'seat_leases'
      and policyname = 'seat_leases_select_own'
  ) then
    execute 'create policy seat_leases_select_own on public.seat_leases
      for select using (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'seat_leases'
      and policyname = 'seat_leases_insert_self'
  ) then
    execute 'create policy seat_leases_insert_self on public.seat_leases
      for insert with check (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'seat_leases'
      and policyname = 'seat_leases_update_self'
  ) then
    execute 'create policy seat_leases_update_self on public.seat_leases
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'seat_leases'
      and policyname = 'seat_leases_delete_self'
  ) then
    execute 'create policy seat_leases_delete_self on public.seat_leases
      for delete using (auth.uid() = user_id)';
  end if;
end$$;

-- Replace legacy claim_seat helper
drop function if exists public.claim_seat(uuid, uuid, uuid);

create or replace function public.claim_seat(p_workspace_id uuid)
returns table (
  lease_id uuid,
  user_id uuid,
  workspace_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_existing uuid;
  v_capacity integer;
  v_in_use integer;
begin
  if v_user is null then
    raise exception 'Not authenticated'
      using errcode = '28P01';
  end if;

  if p_workspace_id is null then
    raise exception 'workspace_id required'
      using errcode = '22004';
  end if;

  -- Clean up stale leases so abandoned sessions free capacity
  delete from public.seat_leases sl
  where sl.workspace_id = p_workspace_id
    and sl.last_seen < (now() - interval '5 minutes');

  -- Seat capacity from subscriptions (fallback to 1)
  select s.seat_count
    into v_capacity
  from public.subscriptions s
  where s.clinic_id = p_workspace_id
    and s.status in ('active', 'trialing')
  order by s.current_period_end desc nulls last
  limit 1;

  v_capacity := greatest(coalesce(v_capacity, 1), 1);

  select sl.lease_id
    into v_existing
  from public.seat_leases sl
  where sl.workspace_id = p_workspace_id
    and sl.user_id = v_user
  limit 1;

  if v_existing is null then
    select count(*)
      into v_in_use
    from public.seat_leases sl
    where sl.workspace_id = p_workspace_id;

    if v_in_use >= v_capacity then
      raise exception 'No seats available'
        using errcode = '23514';
    end if;
  end if;

  return query
  with upsert as (
    insert into public.seat_leases (workspace_id, user_id)
    values (p_workspace_id, v_user)
    on conflict (workspace_id, user_id) do update
      set last_seen = now()
    returning lease_id as ins_lease_id,
      user_id as ins_user_id,
      workspace_id as ins_workspace_id,
      created_at as ins_created_at
  )
  select ins_lease_id, ins_user_id, ins_workspace_id, ins_created_at
  from upsert;
end;
$$;

grant execute on function public.claim_seat(uuid) to authenticated;

-- Heartbeat & release helpers aligned to new schema
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

grant execute on function public.heartbeat(uuid) to authenticated;

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

grant execute on function public.release_seat(uuid) to authenticated;
