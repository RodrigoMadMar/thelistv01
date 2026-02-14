-- ============================================================
-- SEED: Test drops para probar el flujo de checkout
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1) Create a test profile (if not exists)
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@thelist.cl',
  'Host de Prueba',
  'host'
)
ON CONFLICT (id) DO NOTHING;

-- 2) Create a test host (if not exists)
INSERT INTO public.hosts (profile_id, business_name, slug, bio_short, bio_extended, tagline, location, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Bodega Secreta',
  'bodega-secreta',
  'Un espacio oculto en el corazón de Barrio Italia. Experiencias gastronómicas de autor.',
  'Bodega Secreta nació de la obsesión por el buen vino y la buena compañía. Cada experiencia está curada para un grupo reducido.',
  'Donde el vino cuenta historias',
  'Barrio Italia, Santiago',
  'active'
)
ON CONFLICT DO NOTHING;

-- 3) Get the host_id for inserting plans
DO $$
DECLARE
  v_host_id uuid;
BEGIN
  SELECT id INTO v_host_id FROM public.hosts WHERE slug = 'bodega-secreta' LIMIT 1;

  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Host bodega-secreta not found';
  END IF;

  -- Plan 1: Cata de Vinos (nominal, con time slots)
  INSERT INTO public.plans (
    host_id, title, description, short_description, sala, location,
    price_clp, capacity, duration_minutes, image_url, media_urls,
    is_nominal, time_slots, status, drop_number, badges, featured
  ) VALUES (
    v_host_id,
    'Cata Privada de Vinos Naturales',
    'Una experiencia íntima de cata de vinos naturales chilenos, guiada por nuestro sommelier. Incluye 6 copas, tabla de quesos artesanales y pan de masa madre. Grupos de máximo 8 personas en nuestra bodega subterránea.',
    '6 copas, quesos artesanales, bodega subterránea. Máx 8 personas.',
    'La Buena Mesa',
    'Barrio Italia, Santiago',
    45000, 8, 120,
    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=500&fit=crop',
    '["https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=500&fit=crop"]'::jsonb,
    true,
    '[{"time":"19:00","capacity":8},{"time":"21:30","capacity":8}]'::jsonb,
    'published', 15, '["this_week"]'::jsonb, true
  );

  -- Plan 2: Trekking Nocturno (no nominal, 1 time slot)
  INSERT INTO public.plans (
    host_id, title, description, short_description, sala, location,
    price_clp, capacity, duration_minutes, image_url, media_urls,
    is_nominal, time_slots, status, drop_number, badges, featured
  ) VALUES (
    v_host_id,
    'Trekking Nocturno Cajón del Maipo',
    'Caminata bajo las estrellas por senderos del Cajón del Maipo. Sin linternas, solo la luna. Incluye snack de montaña y bebida caliente al final del recorrido.',
    'Sin linternas. Luna llena y sendero ciego. Snack + bebida caliente.',
    'Outdoor',
    'Cajón del Maipo',
    38000, 12, 180,
    'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=500&fit=crop',
    '["https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=500&fit=crop","https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop"]'::jsonb,
    false,
    '[{"time":"20:00","capacity":12}]'::jsonb,
    'published', 16, '["last_seats"]'::jsonb, false
  );

  -- Plan 3: Stand-up (no nominal, sin time slots)
  INSERT INTO public.plans (
    host_id, title, description, short_description, sala, location,
    price_clp, capacity, duration_minutes, image_url,
    is_nominal, time_slots, status, drop_number, badges, featured
  ) VALUES (
    v_host_id,
    'Stand-up a Puerta Cerrada',
    'Un comediante. 20 sillas. Sin grabaciones. Una hora de humor crudo en un espacio íntimo de Bellavista.',
    'Un comediante. 20 sillas. Sin grabaciones.',
    'Fiestas & Sesiones',
    'Bellavista, Santiago',
    25000, 20, 90,
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=500&fit=crop',
    false, null,
    'published', 17, '["small_group"]'::jsonb, false
  );

  RAISE NOTICE 'Inserted 3 test plans for host % (bodega-secreta)', v_host_id;
END $$;

-- Verify: show all published plans with prices including 10% fee
SELECT
  id,
  'DROP ' || LPAD(drop_number::text, 3, '0') AS drop,
  title,
  '$' || TO_CHAR(price_clp, 'FM999G999') AS host_price,
  '$' || TO_CHAR(ROUND(price_clp * 1.1), 'FM999G999') AS customer_price,
  capacity,
  is_nominal,
  time_slots IS NOT NULL AS has_time_slots,
  status
FROM public.plans
WHERE status = 'published'
ORDER BY drop_number DESC;
