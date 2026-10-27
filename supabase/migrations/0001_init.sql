-- Family Tree: schema, row-level security and storage for accounts and cloud save.
-- Run once in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner can read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: owner can update" on public.profiles
  for update using (auth.uid() = id);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------- trees
-- One tree per user, stored as the app's flat id graph (see src/model/types.ts).
create table if not exists public.trees (
  owner uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  share_token uuid unique,
  updated_at timestamptz not null default now()
);

alter table public.trees enable row level security;

create policy "trees: owner full access" on public.trees
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- --------------------------------------------------------- logbook entries
create table if not exists public.logbook_entries (
  id uuid primary key,
  owner uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  entry_type text not null default 'memory'
    check (entry_type in ('memory','event','birth','marriage','death','migration','story','recipe','document','other')),
  date_value text not null default '',
  date_end text not null default '',
  date_qualifier text not null default 'exact'
    check (date_qualifier in ('exact','about','before','after','between')),
  place text not null default '',
  people text[] not null default '{}',
  body text not null default '',
  media jsonb not null default '[]',
  sources text not null default '',
  needs_verification boolean not null default false,
  status text not null default 'draft' check (status in ('draft','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- full-text search over title, place and story (HTML tags stripped)
  fts tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(place, '') || ' ' ||
      regexp_replace(coalesce(body, ''), '<[^>]+>', ' ', 'g'))
  ) stored
);

create index if not exists logbook_entries_owner_idx on public.logbook_entries (owner, date_value);
create index if not exists logbook_entries_people_idx on public.logbook_entries using gin (people);
create index if not exists logbook_entries_fts_idx on public.logbook_entries using gin (fts);

alter table public.logbook_entries enable row level security;

create policy "logbook: owner full access" on public.logbook_entries
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ----------------------------------------------------------------- sharing
-- Create or return the caller's read-only share token.
create or replace function public.ensure_share_token()
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  update public.trees set share_token = coalesce(share_token, gen_random_uuid())
  where owner = auth.uid()
  returning share_token into t;
  if t is null then raise exception 'Save your tree before sharing it'; end if;
  return t;
end $$;

-- Anyone holding a token may read that one tree (and nothing else).
create or replace function public.get_shared_tree(token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select data from public.trees where share_token = token;
$$;

revoke all on function public.get_shared_tree(uuid) from public;
grant execute on function public.get_shared_tree(uuid) to anon, authenticated;
revoke all on function public.ensure_share_token() from public;
grant execute on function public.ensure_share_token() to authenticated;

-- ----------------------------------------------------------------- storage
-- Private bucket; each user may only touch files under a folder named after their id.
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 20971520)
on conflict (id) do nothing;

create policy "media: owner read" on storage.objects
  for select using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media: owner insert" on storage.objects
  for insert with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media: owner delete" on storage.objects
  for delete using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
