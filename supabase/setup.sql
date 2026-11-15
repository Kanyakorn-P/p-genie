-- P' Genie database setup (ASCII only, so Thai text never breaks when pasted).
-- Safe to run as many times as you want. It only creates what is missing.

-- 1) Homeworks
create table if not exists public.tasks (
  id text primary key,
  owner_token text not null,
  user_id uuid references auth.users (id) on delete cascade,
  title text not null,
  subject text not null,
  due text not null,
  urgent boolean not null default false,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) Subject folders
create table if not exists public.folders (
  id text primary key,
  owner_token text not null,
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  color text not null default 'blue',
  created_at timestamptz not null default now()
);

-- 3) Feedback sent from the app
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  owner_token text not null,
  user_id uuid references auth.users (id) on delete set null,
  category text not null check (category in ('idea', 'issue', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- 3) Add the login column to tables created by an older version
alter table public.tasks
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.folders
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- 4) Indexes
create index if not exists tasks_owner_idx on public.tasks (owner_token);
create index if not exists tasks_user_idx on public.tasks (user_id);
create index if not exists folders_owner_idx on public.folders (owner_token);
create index if not exists folders_user_idx on public.folders (user_id);

-- 5) Turn on Row Level Security
alter table public.tasks enable row level security;
alter table public.folders enable row level security;
alter table public.feedback enable row level security;

-- Feedback can be submitted, but is never readable from the public app.
drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert
  with check (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  );

-- A row is visible when it belongs to the logged-in account (user_id = auth.uid())
-- or it is a guest row of this browser room (owner_token = x-owner-token header).

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  );

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert
  with check (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  );

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  )
  with check (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  );

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  );

drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own" on public.folders
  for select
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  );

drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own" on public.folders
  for insert
  with check (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  );

drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own" on public.folders
  for update
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  )
  with check (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  );

drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own" on public.folders
  for delete
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
    )
  );

-- 6) Take a guest task/folder into the account after the first login
--    The app calls this with the update statement below, so nothing to do here.
