-- Add practitioner_notes column to condition_content
alter table public.condition_content
  add column if not exists practitioner_notes text;

-- Create condition_citations table
create table if not exists public.condition_citations (
  id bigint generated always as identity primary key,
  condition_id bigint not null references public.conditions(id) on delete cascade,
  citation text not null,
  url text,
  sort_order int default 0
);

create index if not exists idx_condition_citations_condition_sort
  on public.condition_citations (condition_id, sort_order, id);

-- Enable RLS and policies for citations
alter table public.condition_citations enable row level security;

drop policy if exists "citations_read_all_auth" on public.condition_citations;
create policy "citations_read_all_auth" on public.condition_citations
for select using (auth.role() = 'authenticated');
