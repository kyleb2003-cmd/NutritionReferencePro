-- Add "Eat This, not That" column for condition content
alter table public.condition_content
  add column if not exists eat_this_not_that text;
