-- Health Prototype schema (Supabase / Postgres)
-- Paste this file into Supabase SQL Editor and run it.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  birth_year int,
  sex text,
  target_profile_key text default 'adult_general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  photo_url text,
  source text not null default 'photo_scan',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  grams numeric(10,2),
  quantity numeric(10,2),
  unit text,
  confidence numeric(5,4),
  calories numeric(10,2),
  protein_g numeric(10,2),
  carbs_g numeric(10,2),
  fat_g numeric(10,2),
  micros jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.nutrients_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  calories numeric(10,2),
  protein_g numeric(10,2),
  carbs_g numeric(10,2),
  fat_g numeric(10,2),
  micros jsonb not null default '{}'::jsonb,
  source text not null default 'aggregated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_start timestamptz not null,
  sleep_end timestamptz not null,
  quality int check (quality between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sleep_end > sleep_start)
);

create table if not exists public.regulatory_targets (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null,
  nutrient_key text not null,
  nutrient_name text not null,
  unit text not null,
  target_value numeric(12,4) not null,
  upper_limit_value numeric(12,4),
  source text not null default 'regulatory_average',
  created_at timestamptz not null default now(),
  unique (profile_key, nutrient_key)
);

create table if not exists public.projections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  nutrient_key text not null,
  window_days int not null default 7 check (window_days > 0),
  current_avg_value numeric(12,4),
  target_value numeric(12,4),
  gap_value numeric(12,4),
  slope_per_day numeric(12,4),
  projected_date date,
  status text default 'insufficient_data',
  calculated_at timestamptz not null default now()
);

create index if not exists idx_meals_user_eaten_at on public.meals (user_id, eaten_at desc);
create index if not exists idx_meal_items_user_created on public.meal_items (user_id, created_at desc);
create index if not exists idx_meal_items_meal on public.meal_items (meal_id);
create index if not exists idx_nutrients_daily_user_day on public.nutrients_daily (user_id, day desc);
create index if not exists idx_sleep_logs_user_start on public.sleep_logs (user_id, sleep_start desc);
create index if not exists idx_projections_user_day on public.projections (user_id, day desc);

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_meals_updated_at on public.meals;
create trigger trg_meals_updated_at
before update on public.meals
for each row
execute function public.set_updated_at();

drop trigger if exists trg_nutrients_daily_updated_at on public.nutrients_daily;
create trigger trg_nutrients_daily_updated_at
before update on public.nutrients_daily
for each row
execute function public.set_updated_at();

drop trigger if exists trg_sleep_logs_updated_at on public.sleep_logs;
create trigger trg_sleep_logs_updated_at
before update on public.sleep_logs
for each row
execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.nutrients_daily enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.projections enable row level security;
alter table public.regulatory_targets enable row level security;

drop policy if exists "user_profiles_owner_all" on public.user_profiles;
create policy "user_profiles_owner_all"
on public.user_profiles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "meals_owner_all" on public.meals;
create policy "meals_owner_all"
on public.meals
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "meal_items_owner_all" on public.meal_items;
create policy "meal_items_owner_all"
on public.meal_items
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "nutrients_daily_owner_all" on public.nutrients_daily;
create policy "nutrients_daily_owner_all"
on public.nutrients_daily
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sleep_logs_owner_all" on public.sleep_logs;
create policy "sleep_logs_owner_all"
on public.sleep_logs
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "projections_owner_all" on public.projections;
create policy "projections_owner_all"
on public.projections
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "regulatory_targets_read_authenticated" on public.regulatory_targets;
create policy "regulatory_targets_read_authenticated"
on public.regulatory_targets
for select
to authenticated
using (true);

