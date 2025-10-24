create extension if not exists pgcrypto with schema public;

create table if not exists public.provisioning_sessions (
  state text primary key,
  email text not null,
  username text not null,
  clinic_name text not null,
  stripe_session_id text,
  supabase_user_id uuid,
  status text not null default 'initiated',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

alter table public.provisioning_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'provisioning_sessions'
      and policyname = 'ps_owner_read'
  ) then
    create policy ps_owner_read
    on public.provisioning_sessions
    for select
    using (true);
  end if;
end$$;
