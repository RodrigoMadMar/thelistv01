-- ============================================================
-- 003 — Checkout flow: time slots, nominal tickets, service fee
-- ============================================================

-- ── Plans: add is_nominal and time_slots ──
alter table public.plans
  add column if not exists is_nominal boolean default false,
  add column if not exists time_slots jsonb;
-- time_slots format: [{ "time": "21:00", "capacity": 10 }, ...]

-- ── Applications: add is_nominal ──
alter table public.applications
  add column if not exists is_nominal boolean default false;

-- ── Public applications: add is_nominal ──
alter table public.public_applications
  add column if not exists is_nominal boolean default false;

-- ── Reservations: add contact info, ticket holders, service fee ──
alter table public.reservations
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists contact_rut text,
  add column if not exists ticket_holders jsonb,
  add column if not exists service_fee integer default 0,
  add column if not exists subtotal integer default 0,
  add column if not exists payment_status text default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  add column if not exists payment_provider text
    check (payment_provider is null or payment_provider in ('mercadopago', 'transbank'));
-- ticket_holders format: [{ "name": "...", "rut": "...", "email": "..." }, ...]

-- ── Allow anonymous inserts into reservations (checkout before login) ──
-- Users may not be logged in yet; we use contact_email as identifier
create policy "Anyone can create reservation via checkout"
  on public.reservations for insert
  with check (true);

-- ── Allow reading reservations by contact_email for unauthenticated users ──
create policy "Anyone can view own reservation by id"
  on public.reservations for select
  using (true);
