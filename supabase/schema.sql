-- ============================================================
-- thelist.cl — Full Schema
-- Copy-paste this into the Supabase SQL Editor and run it.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLES
-- ────────────────────────────────────────────────────────────

-- profiles
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        text not null default 'user'
                check (role in ('user', 'host', 'admin')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- hosts
create table if not exists public.hosts (
  id            uuid default gen_random_uuid() primary key,
  profile_id    uuid references public.profiles(id) on delete cascade unique not null,
  business_name text not null,
  slug          text unique not null,
  bio_short     text,
  bio_extended  text,
  tagline       text,
  cover_url     text,
  logo_url      text,
  location      text,
  phone         text,
  instagram     text,
  website       text,
  status        text default 'pending'
                  check (status in ('pending', 'active', 'suspended')),
  created_at    timestamptz default now()
);

-- applications (postulaciones de experiencias)
create table if not exists public.applications (
  id                uuid default gen_random_uuid() primary key,
  host_id           uuid references public.hosts(id) on delete cascade not null,
  experience_name   text not null,
  location          text not null,
  description       text not null,
  commercial_contact text not null,
  daily_capacity    integer not null,
  price_clp         integer not null,
  schedule          jsonb not null,
  days_of_week      text[] not null,
  media_urls        text[],
  status            text default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  admin_comment     text,
  admin_message     text,
  reviewed_by       uuid references public.profiles(id),
  reviewed_at       timestamptz,
  created_at        timestamptz default now()
);

-- plans (drops / experiencias publicables)
create table if not exists public.plans (
  id                uuid default gen_random_uuid() primary key,
  application_id    uuid references public.applications(id) on delete set null unique,
  host_id           uuid references public.hosts(id) on delete cascade not null,
  title             text not null,
  description       text not null,
  short_description text,
  sala              text not null
                      check (sala in ('La Buena Mesa', 'Bar & Vino', 'Arte & Experimental', 'Fiestas & Sesiones', 'Outdoor')),
  location          text not null,
  price_clp         integer not null,
  capacity          integer not null,
  duration_minutes  integer,
  image_url         text,
  media_urls        text[],
  schedule          jsonb,
  days_of_week      text[],
  status            text default 'draft'
                      check (status in ('draft', 'published', 'paused', 'archived')),
  drop_number       serial,
  badges            text[],
  featured          boolean default false,
  published_at      timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- public_applications (postulaciones sin cuenta, desde el wizard público)
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

-- reservations (mock)
create table if not exists public.reservations (
  id          uuid default gen_random_uuid() primary key,
  plan_id     uuid references public.plans(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  num_people  integer default 1,
  date        date not null,
  time_slot   text,
  total_price integer not null,
  status      text default 'confirmed'
                check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at  timestamptz default now()
);

-- onboarding_invites (tokens de onboarding para hosts aprobados)
create table if not exists public.onboarding_invites (
  id                uuid default gen_random_uuid() primary key,
  application_id    uuid not null,
  application_type  text not null check (application_type in ('internal', 'public')),
  email             text not null,
  token             text unique not null,
  expires_at        timestamptz not null,
  used_at           timestamptz,
  created_by        uuid references public.profiles(id),
  created_at        timestamptz default now()
);

-- host_profiles (datos legales y bancarios del host)
create table if not exists public.host_profiles (
  id                uuid default gen_random_uuid() primary key,
  host_id           uuid references public.hosts(id) on delete cascade unique not null,
  legal_name        text,
  rut               text,
  legal_rep_name    text,
  legal_rep_rut     text,
  bank_account      text,
  bank_type         text check (bank_type in ('vista', 'corriente')),
  terms_accepted_at timestamptz,
  onboarded         boolean default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- messages (mock)
create table if not exists public.messages (
  id          uuid default gen_random_uuid() primary key,
  host_id     uuid references public.hosts(id) on delete cascade not null,
  sender_id   uuid references public.profiles(id) on delete cascade not null,
  content     text not null,
  read        boolean default false,
  created_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. TRIGGER: auto-create profile on signup
-- ────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table public.profiles              enable row level security;
alter table public.hosts                 enable row level security;
alter table public.applications          enable row level security;
alter table public.public_applications   enable row level security;
alter table public.plans                 enable row level security;
alter table public.reservations          enable row level security;
alter table public.messages              enable row level security;

-- ── Helper: check if current user is admin ──
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ── Helper: get host_id for current user ──
create or replace function public.my_host_id()
returns uuid as $$
  select id from public.hosts
  where profile_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- ─── PROFILES ───

-- SELECT: own profile or admin
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- UPDATE: own profile only
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── HOSTS ───

-- SELECT public: anyone can see active hosts
create policy "Public can view active hosts"
  on public.hosts for select
  using (status = 'active');

-- SELECT: host can see own record, admin sees all
create policy "Host can view own record"
  on public.hosts for select
  using (profile_id = auth.uid() or public.is_admin());

-- INSERT: authenticated users can create a host profile (postular)
create policy "Authenticated users can create host"
  on public.hosts for insert
  with check (auth.uid() = profile_id);

-- UPDATE: only admin
create policy "Admin can update hosts"
  on public.hosts for update
  using (public.is_admin());

-- ─── APPLICATIONS ───

-- SELECT: host sees own, admin sees all
create policy "Host can view own applications"
  on public.applications for select
  using (host_id = public.my_host_id() or public.is_admin());

-- INSERT: authenticated host
create policy "Host can create application"
  on public.applications for insert
  with check (host_id = public.my_host_id());

-- UPDATE: only admin
create policy "Admin can update applications"
  on public.applications for update
  using (public.is_admin());

-- ─── PUBLIC APPLICATIONS ───

-- INSERT: anyone can submit (no auth required)
create policy "Anyone can submit public applications"
  on public.public_applications for insert
  with check (true);

-- SELECT: only admin
create policy "Admin can view public applications"
  on public.public_applications for select
  using (public.is_admin());

-- UPDATE: only admin
create policy "Admin can update public applications"
  on public.public_applications for update
  using (public.is_admin());

-- ─── PLANS ───

-- SELECT public: anyone can see published plans
create policy "Public can view published plans"
  on public.plans for select
  using (status = 'published');

-- SELECT: host sees own plans, admin sees all
create policy "Host can view own plans"
  on public.plans for select
  using (host_id = public.my_host_id() or public.is_admin());

-- INSERT: only admin
create policy "Admin can create plans"
  on public.plans for insert
  with check (public.is_admin());

-- UPDATE: admin can update all; host can update own draft plans (limited)
create policy "Admin can update plans"
  on public.plans for update
  using (public.is_admin());

create policy "Host can update own draft plans"
  on public.plans for update
  using (host_id = public.my_host_id() and status = 'draft')
  with check (host_id = public.my_host_id() and status = 'draft');

-- ─── RESERVATIONS ───

-- SELECT: user sees own, host sees reservations for their plans, admin sees all
create policy "User can view own reservations"
  on public.reservations for select
  using (
    user_id = auth.uid()
    or plan_id in (select id from public.plans where host_id = public.my_host_id())
    or public.is_admin()
  );

-- INSERT: authenticated user
create policy "Authenticated users can create reservation"
  on public.reservations for insert
  with check (auth.uid() = user_id);

-- ─── MESSAGES ───

-- SELECT: host sees messages for their host_id, admin sees all
create policy "Host can view own messages"
  on public.messages for select
  using (host_id = public.my_host_id() or public.is_admin());

-- INSERT: authenticated user
create policy "Authenticated users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- ─── ONBOARDING INVITES ───

alter table public.onboarding_invites enable row level security;

-- SELECT: admin only (tokens are validated via service role)
create policy "Admin can view onboarding invites"
  on public.onboarding_invites for select
  using (public.is_admin());

-- INSERT: admin only
create policy "Admin can create onboarding invites"
  on public.onboarding_invites for insert
  with check (public.is_admin());

-- UPDATE: admin only (for marking used)
create policy "Admin can update onboarding invites"
  on public.onboarding_invites for update
  using (public.is_admin());

-- ─── HOST PROFILES ───

alter table public.host_profiles enable row level security;

-- SELECT: host sees own, admin sees all
create policy "Host can view own host_profile"
  on public.host_profiles for select
  using (host_id = public.my_host_id() or public.is_admin());

-- INSERT: admin (created during onboarding via service role)
create policy "Admin can create host_profiles"
  on public.host_profiles for insert
  with check (public.is_admin());

-- UPDATE: host can update own, admin can update all
create policy "Host can update own host_profile"
  on public.host_profiles for update
  using (host_id = public.my_host_id() or public.is_admin());
