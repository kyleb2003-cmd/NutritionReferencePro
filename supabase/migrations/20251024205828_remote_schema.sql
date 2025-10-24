create schema if not exists "archive";

create table "archive"."clinic_users" (
    "clinic_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'owner'::text,
    "created_at" timestamp with time zone not null default now()
);


create table "archive"."pending_signups" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "username" text not null,
    "clinic_name" text not null,
    "contact_name" text,
    "stripe_customer_id" text,
    "created_at" timestamp with time zone not null default now()
);


create table "archive"."seat_leases" (
    "lease_id" uuid not null default gen_random_uuid(),
    "clinic_id" uuid not null,
    "user_id" uuid not null,
    "issued_at" timestamp with time zone not null default now(),
    "last_seen" timestamp with time zone not null default now()
);


alter table "archive"."seat_leases" enable row level security;

CREATE UNIQUE INDEX clinic_users_pkey ON archive.clinic_users USING btree (clinic_id, user_id);

CREATE INDEX idx_seat_leases_clinic ON archive.seat_leases USING btree (clinic_id);

CREATE INDEX idx_seat_leases_last_seen ON archive.seat_leases USING btree (clinic_id, last_seen);

CREATE UNIQUE INDEX pending_signups_email_key ON archive.pending_signups USING btree (email);

CREATE UNIQUE INDEX pending_signups_pkey ON archive.pending_signups USING btree (id);

CREATE UNIQUE INDEX pending_signups_username_key ON archive.pending_signups USING btree (username);

CREATE UNIQUE INDEX seat_leases_pkey ON archive.seat_leases USING btree (lease_id);

alter table "archive"."clinic_users" add constraint "clinic_users_pkey" PRIMARY KEY using index "clinic_users_pkey";

alter table "archive"."pending_signups" add constraint "pending_signups_pkey" PRIMARY KEY using index "pending_signups_pkey";

alter table "archive"."seat_leases" add constraint "seat_leases_pkey" PRIMARY KEY using index "seat_leases_pkey";

alter table "archive"."clinic_users" add constraint "clinic_users_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "archive"."clinic_users" validate constraint "clinic_users_clinic_id_fkey";

alter table "archive"."clinic_users" add constraint "clinic_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "archive"."clinic_users" validate constraint "clinic_users_user_id_fkey";

alter table "archive"."seat_leases" add constraint "seat_leases_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "archive"."seat_leases" validate constraint "seat_leases_clinic_id_fkey";

alter table "archive"."seat_leases" add constraint "seat_leases_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "archive"."seat_leases" validate constraint "seat_leases_user_id_fkey";

create policy "seat_leases_delete_owner"
on "archive"."seat_leases"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "seat_leases_insert_owner"
on "archive"."seat_leases"
as permissive
for insert
to public
with check (((auth.uid() = clinic_id) AND (auth.uid() = user_id)));


create policy "seat_leases_select_clinic"
on "archive"."seat_leases"
as permissive
for select
to public
using ((auth.uid() = clinic_id));


create policy "seat_leases_update_owner"
on "archive"."seat_leases"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



revoke delete on table "public"."clinics" from "anon";

revoke insert on table "public"."clinics" from "anon";

revoke references on table "public"."clinics" from "anon";

revoke select on table "public"."clinics" from "anon";

revoke trigger on table "public"."clinics" from "anon";

revoke truncate on table "public"."clinics" from "anon";

revoke update on table "public"."clinics" from "anon";

revoke delete on table "public"."clinics" from "authenticated";

revoke insert on table "public"."clinics" from "authenticated";

revoke references on table "public"."clinics" from "authenticated";

revoke select on table "public"."clinics" from "authenticated";

revoke trigger on table "public"."clinics" from "authenticated";

revoke truncate on table "public"."clinics" from "authenticated";

revoke update on table "public"."clinics" from "authenticated";

revoke delete on table "public"."clinics" from "service_role";

revoke insert on table "public"."clinics" from "service_role";

revoke references on table "public"."clinics" from "service_role";

revoke select on table "public"."clinics" from "service_role";

revoke trigger on table "public"."clinics" from "service_role";

revoke truncate on table "public"."clinics" from "service_role";

revoke update on table "public"."clinics" from "service_role";

revoke delete on table "public"."condition_citations" from "anon";

revoke insert on table "public"."condition_citations" from "anon";

revoke references on table "public"."condition_citations" from "anon";

revoke select on table "public"."condition_citations" from "anon";

revoke trigger on table "public"."condition_citations" from "anon";

revoke truncate on table "public"."condition_citations" from "anon";

revoke update on table "public"."condition_citations" from "anon";

revoke delete on table "public"."condition_citations" from "authenticated";

revoke insert on table "public"."condition_citations" from "authenticated";

revoke references on table "public"."condition_citations" from "authenticated";

revoke select on table "public"."condition_citations" from "authenticated";

revoke trigger on table "public"."condition_citations" from "authenticated";

revoke truncate on table "public"."condition_citations" from "authenticated";

revoke update on table "public"."condition_citations" from "authenticated";

revoke delete on table "public"."condition_citations" from "service_role";

revoke insert on table "public"."condition_citations" from "service_role";

revoke references on table "public"."condition_citations" from "service_role";

revoke select on table "public"."condition_citations" from "service_role";

revoke trigger on table "public"."condition_citations" from "service_role";

revoke truncate on table "public"."condition_citations" from "service_role";

revoke update on table "public"."condition_citations" from "service_role";

revoke delete on table "public"."condition_content" from "anon";

revoke insert on table "public"."condition_content" from "anon";

revoke references on table "public"."condition_content" from "anon";

revoke select on table "public"."condition_content" from "anon";

revoke trigger on table "public"."condition_content" from "anon";

revoke truncate on table "public"."condition_content" from "anon";

revoke update on table "public"."condition_content" from "anon";

revoke delete on table "public"."condition_content" from "authenticated";

revoke insert on table "public"."condition_content" from "authenticated";

revoke references on table "public"."condition_content" from "authenticated";

revoke select on table "public"."condition_content" from "authenticated";

revoke trigger on table "public"."condition_content" from "authenticated";

revoke truncate on table "public"."condition_content" from "authenticated";

revoke update on table "public"."condition_content" from "authenticated";

revoke delete on table "public"."condition_content" from "service_role";

revoke insert on table "public"."condition_content" from "service_role";

revoke references on table "public"."condition_content" from "service_role";

revoke select on table "public"."condition_content" from "service_role";

revoke trigger on table "public"."condition_content" from "service_role";

revoke truncate on table "public"."condition_content" from "service_role";

revoke update on table "public"."condition_content" from "service_role";

revoke delete on table "public"."conditions" from "anon";

revoke insert on table "public"."conditions" from "anon";

revoke references on table "public"."conditions" from "anon";

revoke select on table "public"."conditions" from "anon";

revoke trigger on table "public"."conditions" from "anon";

revoke truncate on table "public"."conditions" from "anon";

revoke update on table "public"."conditions" from "anon";

revoke delete on table "public"."conditions" from "authenticated";

revoke insert on table "public"."conditions" from "authenticated";

revoke references on table "public"."conditions" from "authenticated";

revoke select on table "public"."conditions" from "authenticated";

revoke trigger on table "public"."conditions" from "authenticated";

revoke truncate on table "public"."conditions" from "authenticated";

revoke update on table "public"."conditions" from "authenticated";

revoke delete on table "public"."conditions" from "service_role";

revoke insert on table "public"."conditions" from "service_role";

revoke references on table "public"."conditions" from "service_role";

revoke select on table "public"."conditions" from "service_role";

revoke trigger on table "public"."conditions" from "service_role";

revoke truncate on table "public"."conditions" from "service_role";

revoke update on table "public"."conditions" from "service_role";

revoke delete on table "public"."groups" from "anon";

revoke insert on table "public"."groups" from "anon";

revoke references on table "public"."groups" from "anon";

revoke select on table "public"."groups" from "anon";

revoke trigger on table "public"."groups" from "anon";

revoke truncate on table "public"."groups" from "anon";

revoke update on table "public"."groups" from "anon";

revoke delete on table "public"."groups" from "authenticated";

revoke insert on table "public"."groups" from "authenticated";

revoke references on table "public"."groups" from "authenticated";

revoke select on table "public"."groups" from "authenticated";

revoke trigger on table "public"."groups" from "authenticated";

revoke truncate on table "public"."groups" from "authenticated";

revoke update on table "public"."groups" from "authenticated";

revoke delete on table "public"."groups" from "service_role";

revoke insert on table "public"."groups" from "service_role";

revoke references on table "public"."groups" from "service_role";

revoke select on table "public"."groups" from "service_role";

revoke trigger on table "public"."groups" from "service_role";

revoke truncate on table "public"."groups" from "service_role";

revoke update on table "public"."groups" from "service_role";

revoke delete on table "public"."provisioning_sessions" from "anon";

revoke insert on table "public"."provisioning_sessions" from "anon";

revoke references on table "public"."provisioning_sessions" from "anon";

revoke select on table "public"."provisioning_sessions" from "anon";

revoke trigger on table "public"."provisioning_sessions" from "anon";

revoke truncate on table "public"."provisioning_sessions" from "anon";

revoke update on table "public"."provisioning_sessions" from "anon";

revoke delete on table "public"."provisioning_sessions" from "authenticated";

revoke insert on table "public"."provisioning_sessions" from "authenticated";

revoke references on table "public"."provisioning_sessions" from "authenticated";

revoke select on table "public"."provisioning_sessions" from "authenticated";

revoke trigger on table "public"."provisioning_sessions" from "authenticated";

revoke truncate on table "public"."provisioning_sessions" from "authenticated";

revoke update on table "public"."provisioning_sessions" from "authenticated";

revoke delete on table "public"."provisioning_sessions" from "service_role";

revoke insert on table "public"."provisioning_sessions" from "service_role";

revoke references on table "public"."provisioning_sessions" from "service_role";

revoke select on table "public"."provisioning_sessions" from "service_role";

revoke trigger on table "public"."provisioning_sessions" from "service_role";

revoke truncate on table "public"."provisioning_sessions" from "service_role";

revoke update on table "public"."provisioning_sessions" from "service_role";

revoke delete on table "public"."seat_leases" from "anon";

revoke insert on table "public"."seat_leases" from "anon";

revoke references on table "public"."seat_leases" from "anon";

revoke select on table "public"."seat_leases" from "anon";

revoke trigger on table "public"."seat_leases" from "anon";

revoke truncate on table "public"."seat_leases" from "anon";

revoke update on table "public"."seat_leases" from "anon";

revoke delete on table "public"."seat_leases" from "authenticated";

revoke insert on table "public"."seat_leases" from "authenticated";

revoke references on table "public"."seat_leases" from "authenticated";

revoke select on table "public"."seat_leases" from "authenticated";

revoke trigger on table "public"."seat_leases" from "authenticated";

revoke truncate on table "public"."seat_leases" from "authenticated";

revoke update on table "public"."seat_leases" from "authenticated";

revoke delete on table "public"."seat_leases" from "service_role";

revoke insert on table "public"."seat_leases" from "service_role";

revoke references on table "public"."seat_leases" from "service_role";

revoke select on table "public"."seat_leases" from "service_role";

revoke trigger on table "public"."seat_leases" from "service_role";

revoke truncate on table "public"."seat_leases" from "service_role";

revoke update on table "public"."seat_leases" from "service_role";

revoke delete on table "public"."subscriptions" from "anon";

revoke insert on table "public"."subscriptions" from "anon";

revoke references on table "public"."subscriptions" from "anon";

revoke select on table "public"."subscriptions" from "anon";

revoke trigger on table "public"."subscriptions" from "anon";

revoke truncate on table "public"."subscriptions" from "anon";

revoke update on table "public"."subscriptions" from "anon";

revoke delete on table "public"."subscriptions" from "authenticated";

revoke insert on table "public"."subscriptions" from "authenticated";

revoke references on table "public"."subscriptions" from "authenticated";

revoke select on table "public"."subscriptions" from "authenticated";

revoke trigger on table "public"."subscriptions" from "authenticated";

revoke truncate on table "public"."subscriptions" from "authenticated";

revoke update on table "public"."subscriptions" from "authenticated";

revoke delete on table "public"."subscriptions" from "service_role";

revoke insert on table "public"."subscriptions" from "service_role";

revoke references on table "public"."subscriptions" from "service_role";

revoke select on table "public"."subscriptions" from "service_role";

revoke trigger on table "public"."subscriptions" from "service_role";

revoke truncate on table "public"."subscriptions" from "service_role";

revoke update on table "public"."subscriptions" from "service_role";

alter table "public"."clinics" drop constraint "clinics_id_fkey";

alter table "public"."seat_leases" drop constraint "seat_leases_clinic_id_fkey";

alter table "public"."seat_leases" drop constraint "seat_leases_user_id_fkey";

drop index if exists "public"."idx_seat_leases_clinic";

drop index if exists "public"."clinics_stripe_customer_id_key";

drop index if exists "public"."subscriptions_stripe_customer_id_key";

create table "public"."profiles" (
    "user_id" uuid not null,
    "username" text not null,
    "contact_name" text,
    "clinic_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "email" text not null
);


alter table "public"."clinics" alter column "id" set default gen_random_uuid();

alter table "public"."seat_leases" add column "expires_at" timestamp with time zone;

alter table "public"."subscriptions" add column "subscription_id" text;

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

CREATE UNIQUE INDEX clinics_stripe_customer_id_key ON public.clinics USING btree (stripe_customer_id);

CREATE UNIQUE INDEX subscriptions_stripe_customer_id_key ON public.subscriptions USING btree (stripe_customer_id);

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."profiles" add constraint "profiles_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_clinic_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.claim_seat(p_workspace_id uuid)
 RETURNS TABLE(lease_id uuid, user_id uuid, workspace_id uuid, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_existing uuid;
  v_capacity integer;
  v_in_use integer;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28P01';
  end if;

  if p_workspace_id is null then
    raise exception 'workspace_id required' using errcode = '22004';
  end if;

  delete from public.seat_leases sl
  where sl.workspace_id = p_workspace_id
    and sl.last_seen < (now() - interval '5 minutes');

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
      raise exception 'No seats available' using errcode = '23514';
    end if;
  end if;

  return query
  with upsert as (
    insert into public.seat_leases (workspace_id, user_id)
    values (p_workspace_id, v_user)
    on conflict (workspace_id, user_id) do update
      set last_seen = now()
    returning
      lease_id as ins_lease_id,
      user_id as ins_user_id,
      workspace_id as ins_workspace_id,
      created_at as ins_created_at
  )
  select ins_lease_id, ins_user_id, ins_workspace_id, ins_created_at
  from upsert;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.heartbeat(p_lease uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  update public.seat_leases
    set last_seen = now()
  where lease_id = p_lease
    and user_id = auth.uid();
  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.release_seat(p_lease uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  delete from public.seat_leases
  where lease_id = p_lease
    and user_id = auth.uid();
  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;



