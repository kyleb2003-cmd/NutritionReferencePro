-- Ensure 'Gastrointestinal' group exists
insert into public.groups (name, slug)
values ('Gastrointestinal', 'gastrointestinal')
on conflict (slug) do nothing;

-- Add Crohn's Disease under GI
insert into public.conditions (group_id, name, slug)
select g.id, 'Crohn''s Disease', 'crohns-disease'
from public.groups g
where g.slug = 'gastrointestinal'
on conflict (slug) do nothing;

-- Ensure 'General' group exists (stand-alone diseases)
insert into public.groups (name, slug)
values ('General', 'general')
on conflict (slug) do nothing;

-- Add Type-2 Diabetes under General
insert into public.conditions (group_id, name, slug)
select g.id, 'Type 2 Diabetes', 'type-2-diabetes'
from public.groups g
where g.slug = 'general'
on conflict (slug) do nothing;

-- Minimal placeholder content for both conditions (if missing)
insert into public.condition_content (condition_id, overview)
select c.id, 'Overview coming soon.'
from public.conditions c
where c.slug in ('crohns-disease', 'type-2-diabetes')
  and not exists (
    select 1 from public.condition_content cc
    where cc.condition_id = c.id
  );
