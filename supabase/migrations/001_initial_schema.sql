-- ============================================================================
-- Baru Studio (CADe_SIMU + TIA Portal S7-1200) — Initial Cloud Schema
-- Migration: 001_initial_schema.sql
-- Standards: DB-First Persistence & DB Safety/Integrity (100% Idempotent)
-- IMPORTANT: Contains ZERO destructive statements (no DROP TABLE / TRUNCATE).
-- ============================================================================

-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

-- 1.1 public.profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  onboarding_completed boolean not null default false,
  onboarding_skipped boolean not null default false,
  onboarding_step integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist if table was partially created previously
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists onboarding_skipped boolean not null default false;
alter table public.profiles add column if not exists onboarding_step integer not null default 1;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- 1.2 public.projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  title text not null default 'Sin título',
  description text not null default '',
  circuit_doc jsonb not null,
  tia_program jsonb not null,
  share_slug text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects add column if not exists description text not null default '';
alter table public.projects add column if not exists share_slug text;
alter table public.projects add column if not exists is_public boolean not null default false;
alter table public.projects add column if not exists created_at timestamptz not null default now();
alter table public.projects add column if not exists updated_at timestamptz not null default now();

-- 1.3 public.exam_attempts
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  project_id uuid references public.projects (id) on delete set null,
  hidden_fault_id text not null,
  submitted_answer text not null,
  is_passed boolean not null,
  score numeric(3, 1) not null,
  attempts integer not null default 1,
  student_notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.exam_attempts add column if not exists project_id uuid references public.projects (id) on delete set null;
alter table public.exam_attempts add column if not exists attempts integer not null default 1;
alter table public.exam_attempts add column if not exists student_notes text not null default '';
alter table public.exam_attempts add column if not exists created_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- 2. Helper Functions & Triggers
-- ----------------------------------------------------------------------------

-- 2.1 Automatic updated_at timestamp trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

-- 2.2 Auto-create profile row when a new auth.users account is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      ''
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------

create index if not exists idx_projects_user_updated
  on public.projects (user_id, updated_at desc);

create index if not exists idx_projects_share_slug
  on public.projects (share_slug)
  where share_slug is not null;

create index if not exists idx_exam_attempts_user_created
  on public.exam_attempts (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 4. Row Level Security (RLS) & Policies
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.exam_attempts enable row level security;

-- 4.1 public.profiles policies
drop policy if exists "Profiles readable by owner" on public.profiles;
create policy "Profiles readable by owner"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Profiles insertable by owner" on public.profiles;
create policy "Profiles insertable by owner"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles updatable by owner" on public.profiles;
create policy "Profiles updatable by owner"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4.2 public.projects policies
drop policy if exists "Projects readable by owner" on public.projects;
create policy "Projects readable by owner"
  on public.projects
  for select
  using (auth.uid() = user_id);

drop policy if exists "Public shared projects readable" on public.projects;
create policy "Public shared projects readable"
  on public.projects
  for select
  using (is_public = true and share_slug is not null);

drop policy if exists "Projects insertable by owner" on public.projects;
create policy "Projects insertable by owner"
  on public.projects
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Projects updatable by owner" on public.projects;
create policy "Projects updatable by owner"
  on public.projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Projects deletable by owner" on public.projects;
create policy "Projects deletable by owner"
  on public.projects
  for delete
  using (auth.uid() = user_id);

-- 4.3 public.exam_attempts policies
drop policy if exists "Exam attempts readable by owner" on public.exam_attempts;
create policy "Exam attempts readable by owner"
  on public.exam_attempts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Exam attempts insertable by owner" on public.exam_attempts;
create policy "Exam attempts insertable by owner"
  on public.exam_attempts
  for insert
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. Schema Privileges (Explicit Supabase API Role Grants)
-- ----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.projects to anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert on public.exam_attempts to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Safe Backfill for Existing Auth Users
-- ----------------------------------------------------------------------------

insert into public.profiles (id, email, full_name)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    ''
  )
from auth.users as u
on conflict (id) do nothing;

-- Ask PostgREST to reload its schema cache immediately
notify pgrst, 'reload schema';
