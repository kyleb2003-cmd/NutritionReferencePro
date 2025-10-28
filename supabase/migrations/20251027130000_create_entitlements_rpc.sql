drop function if exists public.get_entitlements();

create or replace function public.get_entitlements()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_workspace uuid;
  v_has_membership boolean := false;
  v_status text := null;
  v_current_period_end timestamptz := null;
  v_can boolean := false;
  v_lease_recent boolean := false;
begin
  if v_user is null then
    raise exception 'Not authenticated'
      using errcode = '28P01';
  end if;

  select p.clinic_id
    into v_workspace
  from public.profiles p
  where p.user_id = v_user;

  if v_workspace is null then
    select c.id
      into v_workspace
    from public.clinics c
    where c.id = v_user
    limit 1;

    if v_workspace is not null then
      update public.profiles p
         set clinic_id = v_workspace
       where p.user_id = v_user;
    end if;
  end if;

  v_has_membership := v_workspace is not null;

  if v_workspace is not null then
    select s.status,
           s.current_period_end
      into v_status, v_current_period_end
    from public.subscriptions s
    where s.clinic_id = v_workspace
    order by coalesce(s.updated_at, s.created_at, now()) desc
    limit 1;

    select exists (
      select 1
      from public.seat_leases sl
      where sl.workspace_id = v_workspace
        and sl.user_id = v_user
        and sl.last_seen >= (now() - interval '2 minutes')
    )
    into v_lease_recent;

    v_can := coalesce(v_status = 'active', false);
  end if;

  return jsonb_build_object(
    'workspace_id', v_workspace,
    'has_membership', v_has_membership,
    'subscription_status', v_status,
    'current_period_end', v_current_period_end,
    'can_export_handouts', v_can,
    'can_access_branding', v_can,
    'lease_recent', v_lease_recent
  );
end;
$$;

grant execute on function public.get_entitlements() to authenticated;
