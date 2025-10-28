-- Align RLS policies with workspace-based clinic ownership via profiles.
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'subscriptions_select_own'
  ) then
    drop policy "subscriptions_select_own" on public.subscriptions;
  end if;

  create policy "subscriptions_select_workspace"
    on public.subscriptions
    for select
    using (
      auth.uid() = clinic_id
      or exists (
        select 1
        from public.profiles p
        where p.user_id = auth.uid()
          and p.clinic_id = public.subscriptions.clinic_id
      )
    );
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clinics'
      and policyname = 'clinics_select_own'
  ) then
    drop policy "clinics_select_own" on public.clinics;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clinics'
      and policyname = 'clinics_upsert_own'
  ) then
    drop policy "clinics_upsert_own" on public.clinics;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clinics'
      and policyname = 'clinics_update_own'
  ) then
    drop policy "clinics_update_own" on public.clinics;
  end if;

  create policy "clinics_select_workspace"
    on public.clinics
    for select
    using (
      auth.uid() = id
      or exists (
        select 1
        from public.profiles p
        where p.user_id = auth.uid()
          and p.clinic_id = public.clinics.id
      )
    );

  create policy "clinics_insert_workspace"
    on public.clinics
    for insert
    with check (
      auth.uid() = id
      or exists (
        select 1
        from public.profiles p
        where p.user_id = auth.uid()
          and p.clinic_id = public.clinics.id
      )
    );

  create policy "clinics_update_workspace"
    on public.clinics
    for update
    using (
      auth.uid() = id
      or exists (
        select 1
        from public.profiles p
        where p.user_id = auth.uid()
          and p.clinic_id = public.clinics.id
      )
    )
    with check (
      auth.uid() = id
      or exists (
        select 1
        from public.profiles p
        where p.user_id = auth.uid()
          and p.clinic_id = public.clinics.id
      )
    );
end;
$$;
