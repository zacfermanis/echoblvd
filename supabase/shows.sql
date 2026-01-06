-- Table: shows
create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  date timestamptz not null,
  venue text not null,
  city text not null,
  country text not null,
  is_upcoming boolean not null default true,
  start_time time,
  end_time time,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_shows_updated_at on public.shows;
create trigger trg_shows_updated_at
before update on public.shows
for each row execute procedure public.set_updated_at();

-- Index to speed up upcoming queries
create index if not exists idx_shows_date on public.shows (date);
create index if not exists idx_shows_is_upcoming on public.shows (is_upcoming);

-- Enable RLS and policies
alter table public.shows enable row level security;

-- In case table already exists, ensure time columns are present
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'shows' and column_name = 'start_time') then
    alter table public.shows add column start_time time;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'shows' and column_name = 'end_time') then
    alter table public.shows add column end_time time;
  end if;
end$$;

-- Allow anyone to read shows (public listings)
drop policy if exists "Allow read to all" on public.shows;
create policy "Allow read to all"
on public.shows
for select
to anon, authenticated
using (true);

-- No insert/update/delete for anon/authenticated by default.
-- Our server uses the service role key which bypasses RLS for writes.


