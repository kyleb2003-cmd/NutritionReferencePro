drop function if exists public.claim_seat(uuid, uuid, uuid);
drop function if exists public.claim_seat(uuid, uuid);
drop function if exists public.claim_seat(uuid);

create or replace function public.claim_seat(
  workspace_id uuid,
  caller_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace uuid := workspace_id;
  v_caller uuid := caller_user_id;
  v_lease_id uuid;
  v_user_id uuid;
  v_workspace_id uuid;
  v_created_at timestamptz;
  v_capacity integer;
  v_in_use integer;
  v_has_subscription boolean := false;
begin
  if v_caller is null then
    raise exception 'Not authenticated'
      using errcode = '28P01';
  end if;

  if v_workspace is null then
    raise exception 'workspace_id required'
      using errcode = '22004';
  end if;

  delete from public.seat_leases sl
  where sl.workspace_id = v_workspace
    and sl.last_seen < (now() - interval '5 minutes');

  update public.seat_leases sl
     set last_seen = now()
   where sl.workspace_id = v_workspace
     and sl.user_id = v_caller
  returning sl.lease_id,
            sl.user_id,
            sl.workspace_id,
            sl.created_at
    into v_lease_id, v_user_id, v_workspace_id, v_created_at;

  if v_lease_id is not null then
    return jsonb_build_object(
      'claimed', v_lease_id is not null,
      'lease_id', v_lease_id,
      'seat_id', v_lease_id,
      'user_id', v_user_id,
      'workspace_id', v_workspace_id,
      'created_at', v_created_at
    );
  end if;

  with capacity as (
    select s.seat_count,
           s.id
      from public.subscriptions s
     where s.clinic_id = v_workspace
       and s.status in ('active', 'trialing')
     order by s.current_period_end desc nulls last
     limit 1
     for update skip locked
  )
  select capacity.seat_count,
         true
    into v_capacity, v_has_subscription
    from capacity;

  if v_capacity is null then
    select s.seat_count,
           true
      into v_capacity, v_has_subscription
      from public.subscriptions s
     where s.clinic_id = v_workspace
       and s.status in ('active', 'trialing')
     order by s.current_period_end desc nulls last
     limit 1
     for update;
  end if;

  if v_capacity is null then
    v_capacity := 1;
    v_has_subscription := false;
  end if;

  v_capacity := greatest(coalesce(v_capacity, 1), 1);

  if not v_has_subscription then
    perform pg_advisory_xact_lock(hashtextextended(v_workspace::text, 0));
  end if;

  select count(*)
    into v_in_use
    from public.seat_leases sl
   where sl.workspace_id = v_workspace;

  if v_in_use >= v_capacity then
    raise exception 'No seats available'
      using errcode = '23514';
  end if;

  begin
    insert into public.seat_leases as sl (workspace_id, user_id)
    values (v_workspace, v_caller)
    returning sl.lease_id,
              sl.user_id,
              sl.workspace_id,
              sl.created_at
      into v_lease_id, v_user_id, v_workspace_id, v_created_at;
  exception
    when unique_violation then
      update public.seat_leases sl
         set last_seen = now()
       where sl.workspace_id = v_workspace
         and sl.user_id = v_caller
      returning sl.lease_id,
                sl.user_id,
                sl.workspace_id,
                sl.created_at
        into v_lease_id, v_user_id, v_workspace_id, v_created_at;
  end;

  if v_lease_id is null then
    return jsonb_build_object(
      'claimed', false,
      'lease_id', null,
      'seat_id', null,
      'user_id', v_caller,
      'workspace_id', v_workspace,
      'created_at', null
    );
  end if;

  return jsonb_build_object(
    'claimed', v_lease_id is not null,
    'lease_id', v_lease_id,
    'seat_id', v_lease_id,
    'user_id', v_user_id,
    'workspace_id', v_workspace_id,
    'created_at', v_created_at
  );
end;
$$;

do $$
begin
  -- Ensure every profile has an associated clinic/workspace.
  insert into public.clinics (id, clinic_name)
  select p.user_id,
         coalesce(nullif(p.contact_name, ''), nullif(p.email, ''), p.username, 'Clinic')
  from public.profiles p
  where p.clinic_id is null
  on conflict (id) do nothing;

  update public.profiles p
     set clinic_id = p.user_id
   where p.clinic_id is null
     and exists (
       select 1
       from public.clinics c
       where c.id = p.user_id
     );
end;
$$;

grant execute on function public.claim_seat(uuid, uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where t.relname = 'seat_leases'
      and n.nspname = 'public'
      and c.conname = 'seat_leases_unique_workspace_user'
  ) then
    if exists (
      select 1
      from pg_class i
      join pg_namespace n on n.oid = i.relnamespace
      where i.relname = 'seat_leases_workspace_user_uidx'
        and n.nspname = 'public'
    ) then
      execute 'alter table public.seat_leases
        add constraint seat_leases_unique_workspace_user
        unique using index seat_leases_workspace_user_uidx';
    else
      execute 'alter table public.seat_leases
        add constraint seat_leases_unique_workspace_user
        unique (workspace_id, user_id)';
    end if;
  end if;
end;
$$;
