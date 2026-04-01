-- Add sleep_schedule table for storing user's preferred sleep times
create table if not exists public.sleep_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  sleep_start_time text not null default '23:00',
  sleep_end_time text not null default '07:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sleep_schedule_user on public.sleep_schedule (user_id);

drop trigger if exists trg_sleep_schedule_updated_at on public.sleep_schedule;
create trigger trg_sleep_schedule_updated_at
before update on public.sleep_schedule
for each row
execute function public.set_updated_at();

alter table public.sleep_schedule enable row level security;

drop policy if exists "sleep_schedule_owner_all" on public.sleep_schedule;
create policy "sleep_schedule_owner_all"
on public.sleep_schedule
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
