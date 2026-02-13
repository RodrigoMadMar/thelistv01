-- ============================================================
-- thelist.cl — Seed Data
-- Run AFTER schema.sql in the Supabase SQL Editor.
-- NOTE: The profile rows for hosts/admin are created automatically
-- by the handle_new_user trigger when you create users in
-- Supabase Auth. This seed uses fixed UUIDs so you can also
-- insert them directly for local/testing purposes.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ────────────────────────────────────────────────────────────

insert into public.profiles (id, email, full_name, role) values
  ('a0000000-0000-0000-0000-000000000001', 'admin@thelist.cl',       'Admin TheList', 'admin'),
  ('a0000000-0000-0000-0000-000000000002', 'host1@thelist.cl',       'Matías Correa',  'host'),
  ('a0000000-0000-0000-0000-000000000003', 'host2@thelist.cl',       'Camila Vega',    'host'),
  ('a0000000-0000-0000-0000-000000000004', 'usuario@thelist.cl',     'Pedro Sánchez',  'user')
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 2. HOSTS
-- ────────────────────────────────────────────────────────────

insert into public.hosts (id, profile_id, business_name, slug, bio_short, tagline, location, instagram, status) values
  ('b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000002',
   'Correa Experiencias',
   'correa-experiencias',
   'Experiencias gastronómicas y outdoor en Santiago y alrededores.',
   'Sabores que cuentan historias',
   'Santiago',
   '@correa_exp',
   'active'),
  ('b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000003',
   'Vega Creativa',
   'vega-creativa',
   'Arte, cerámica y experiencias sensoriales únicas.',
   'Crea con las manos',
   'Providencia',
   '@vegacreativa',
   'active')
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 3. APPLICATIONS (3 in different states)
-- ────────────────────────────────────────────────────────────

insert into public.applications (id, host_id, experience_name, location, description, commercial_contact, daily_capacity, price_clp, schedule, days_of_week, status, admin_comment, admin_message, reviewed_by, reviewed_at) values
  -- Approved → became plan "Private tasting"
  ('c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'Private tasting',
   'Barrio Italia',
   'Experiencia de degustación privada con 8 copas y maridaje exclusivo.',
   'matias@correaexp.cl',
   8, 45000,
   '[{"start":"21:00","end":"23:30"}]',
   '{"viernes","sábado"}',
   'approved',
   'Excelente propuesta, aprobar.',
   'Bienvenido a TheList. Tu experiencia fue aprobada.',
   'a0000000-0000-0000-0000-000000000001',
   now()),
  -- Pending
  ('c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002',
   'Taller de grabado en cobre',
   'Barrio Italia',
   'Taller intensivo de grabado artístico en planchas de cobre.',
   'camila@vegacreativa.cl',
   6, 55000,
   '[{"start":"10:00","end":"13:00"}]',
   '{"sábado"}',
   'pending',
   null, null, null, null),
  -- Rejected
  ('c0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000001',
   'Asado masivo',
   'Parque O''Higgins',
   'Asado abierto para 200 personas.',
   'matias@correaexp.cl',
   200, 15000,
   '[{"start":"13:00","end":"17:00"}]',
   '{"domingo"}',
   'rejected',
   'No cumple criterio de exclusividad.',
   'Lo sentimos, la experiencia no se ajusta al formato curado de TheList.',
   'a0000000-0000-0000-0000-000000000001',
   now())
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 4. PLANS (6 published — matching Drops.tsx data)
-- ────────────────────────────────────────────────────────────

insert into public.plans (id, application_id, host_id, title, description, short_description, sala, location, price_clp, capacity, duration_minutes, image_url, media_urls, schedule, days_of_week, status, drop_number, badges, featured, published_at) values
  -- DROP 014: Private tasting
  ('d0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'Private tasting',
   'Luz baja, 8 copas, un host obsesivo.',
   'Luz baja, 8 copas, un host obsesivo.',
   'La Buena Mesa',
   'Barrio Italia',
   45000, 3, 150,
   'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop',
   '{"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=800&h=500&fit=crop"}',
   '[{"start":"21:00","end":"23:30"}]',
   '{"viernes"}',
   'published', 14,
   '{"last_seats"}',
   true, now()),

  -- DROP 013: Trekking nocturno
  ('d0000000-0000-0000-0000-000000000002',
   null,
   'b0000000-0000-0000-0000-000000000001',
   'Trekking nocturno',
   'Sin linternas. Luna llena y sendero ciego.',
   'Sin linternas. Luna llena y sendero ciego.',
   'Outdoor',
   'Cajón del Maipo',
   38000, 8, 240,
   'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop',
   '{"https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=500&fit=crop"}',
   '[{"start":"20:30","end":"00:30"}]',
   '{"sábado"}',
   'published', 13,
   '{"members_first"}',
   false, now()),

  -- DROP 012: Cerámica en silencio
  ('d0000000-0000-0000-0000-000000000003',
   null,
   'b0000000-0000-0000-0000-000000000002',
   'Cerámica en silencio',
   '2 horas. Sin música. Solo tus manos y el barro.',
   '2 horas. Sin música. Solo tus manos y el barro.',
   'Arte & Experimental',
   'Providencia',
   32000, 4, 120,
   'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop',
   '{"https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=500&fit=crop"}',
   '[{"start":"11:00","end":"13:00"}]',
   '{"domingo"}',
   'published', 12,
   '{"this_week"}',
   false, now()),

  -- DROP 011: Kayak en los fiordos
  ('d0000000-0000-0000-0000-000000000004',
   null,
   'b0000000-0000-0000-0000-000000000001',
   'Kayak en los fiordos',
   'Tres días. Sin señal. Máximo 6 personas.',
   'Tres días. Sin señal. Máximo 6 personas.',
   'Outdoor',
   'Aysén',
   280000, 0, 4320,
   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
   '{"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1473181488821-2d23949a045a?w=800&h=500&fit=crop"}',
   null,
   null,
   'published', 11,
   '{"sold_out"}',
   false, now()),

  -- DROP 010: Stand-up a puerta cerrada
  ('d0000000-0000-0000-0000-000000000005',
   null,
   'b0000000-0000-0000-0000-000000000002',
   'Stand-up a puerta cerrada',
   'Un comediante. 20 sillas. Sin grabaciones.',
   'Un comediante. 20 sillas. Sin grabaciones.',
   'Fiestas & Sesiones',
   'Bellavista',
   25000, 2, 90,
   'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=400&fit=crop',
   '{"https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&h=500&fit=crop"}',
   '[{"start":"22:00","end":"23:30"}]',
   '{"jueves"}',
   'published', 10,
   '{"last_seats"}',
   false, now()),

  -- DROP 009: Cena ciega
  ('d0000000-0000-0000-0000-000000000006',
   null,
   'b0000000-0000-0000-0000-000000000001',
   'Cena ciega',
   'No sabes qué comes. No sabes quién cocina. Confía.',
   'No sabes qué comes. No sabes quién cocina. Confía.',
   'Bar & Vino',
   'Lastarria',
   62000, 6, 120,
   'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop',
   '{"https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop"}',
   '[{"start":"21:00","end":"23:00"}]',
   '{"sábado"}',
   'published', 9,
   '{"small_group"}',
   false, now())
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 5. RESERVATIONS (3 mock)
-- ────────────────────────────────────────────────────────────

insert into public.reservations (id, plan_id, user_id, num_people, date, time_slot, total_price, status) values
  ('e0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000004',
   2, '2025-03-07', '21:00', 90000, 'confirmed'),
  ('e0000000-0000-0000-0000-000000000002',
   'd0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000004',
   1, '2025-03-09', '11:00', 32000, 'confirmed'),
  ('e0000000-0000-0000-0000-000000000003',
   'd0000000-0000-0000-0000-000000000006',
   'a0000000-0000-0000-0000-000000000004',
   3, '2025-03-15', '21:00', 186000, 'pending')
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 6. MESSAGES (2 mock)
-- ────────────────────────────────────────────────────────────

insert into public.messages (id, host_id, sender_id, content, read) values
  ('f0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000004',
   'Hola, ¿hay opciones vegetarianas para el Private tasting?',
   false),
  ('f0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000004',
   '¿Puedo llevar mi propio delantal para la cerámica?',
   true)
on conflict (id) do nothing;
