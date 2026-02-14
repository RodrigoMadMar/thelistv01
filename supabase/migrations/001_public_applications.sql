-- ============================================================
-- Migration: Create public_applications table
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Create table
create table if not exists public.public_applications (
  id                  uuid default gen_random_uuid() primary key,
  experience_name     text not null,
  email               text not null,
  phone               text not null,
  host_name           text,
  location            text not null,
  description         text not null,
  commercial_contact  text not null,
  daily_capacity      integer not null,
  price_clp           integer not null,
  days_of_week        text[] not null,
  schedule            jsonb not null,
  media_urls          text[],
  exclusivity_confirmed boolean default false,
  status              text default 'pending'
                        check (status in ('pending', 'approved', 'rejected')),
  admin_comment       text,
  reviewed_by         uuid references public.profiles(id),
  reviewed_at         timestamptz,
  created_at          timestamptz default now()
);

-- 2. Enable RLS
alter table public.public_applications enable row level security;

-- 3. RLS policies

-- Anyone can submit (no auth required)
create policy "Anyone can submit public applications"
  on public.public_applications for insert
  with check (true);

-- Only admin can view
create policy "Admin can view public applications"
  on public.public_applications for select
  using (public.is_admin());

-- Only admin can update
create policy "Admin can update public applications"
  on public.public_applications for update
  using (public.is_admin());
