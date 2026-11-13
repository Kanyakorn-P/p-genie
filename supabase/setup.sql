-- ตารางเก็บการบ้านของพี่จินนี่
create table if not exists public.tasks (
  id text primary key,
  owner_token text not null,
  title text not null,
  subject text not null,
  due text not null default 'ยังไม่ระบุวันส่ง',
  urgent boolean not null default false,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_owner_idx on public.tasks (owner_token);

-- เปิดกฎ RLS: ลิงก์แอปเป็นสาธารณะ ทุกคนที่มีกุญแจ publishable เรียก API ได้
-- แต่จะเห็นเฉพาะแถวที่ owner_token ตรงกับหัวข้อ x-owner-token ที่เบราว์เซอร์เราส่งมา
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select
  using (owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token'));

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert
  with check (owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token'));

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update
  using (owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token'))
  with check (owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token'));

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete
  using (owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token'));
