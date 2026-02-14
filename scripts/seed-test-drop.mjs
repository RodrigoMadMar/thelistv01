import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ldqqkzmampmdqxdjsuyj.supabase.co",
  // service role key for admin operations
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcXFrem1hbXBtZHF4ZGpzdXlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk5NzkwNSwiZXhwIjoyMDg2NTczOTA1fQ.asiuXci367cS7vYnFEUL74UTSJH5IPkOwkVho7HYbBQ"
);

async function seed() {
  console.log("Checking existing hosts...");

  // Check if we already have a host
  let { data: hosts } = await supabase.from("hosts").select("*").limit(1);
  let hostId;

  if (hosts && hosts.length > 0) {
    hostId = hosts[0].id;
    console.log(`Using existing host: ${hosts[0].business_name} (${hostId})`);
  } else {
    console.log("No host found. Creating test profile and host...");

    // Create a test profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .insert({
        id: "00000000-0000-0000-0000-000000000001",
        email: "test@thelist.cl",
        full_name: "Host de Prueba",
        role: "host",
      })
      .select()
      .single();

    if (profileErr && !profileErr.message.includes("duplicate")) {
      console.error("Error creating profile:", profileErr);
      return;
    }

    const profileId = profile?.id || "00000000-0000-0000-0000-000000000001";

    // Create a host
    const { data: host, error: hostErr } = await supabase
      .from("hosts")
      .insert({
        profile_id: profileId,
        business_name: "Bodega Secreta",
        slug: "bodega-secreta",
        bio_short: "Un espacio oculto en el corazón de Barrio Italia. Experiencias gastronómicas de autor.",
        bio_extended: "Bodega Secreta nació de la obsesión por el buen vino y la buena compañía. Cada experiencia está curada para un grupo reducido.",
        tagline: "Donde el vino cuenta historias",
        location: "Barrio Italia, Santiago",
        status: "active",
      })
      .select()
      .single();

    if (hostErr) {
      console.error("Error creating host:", hostErr);
      return;
    }

    hostId = host.id;
    console.log(`Created host: ${host.business_name} (${hostId})`);
  }

  // Check for existing published plans
  const { data: existingPlans } = await supabase
    .from("plans")
    .select("id, title")
    .eq("host_id", hostId)
    .eq("status", "published");

  if (existingPlans && existingPlans.length > 0) {
    console.log(`\nExisting published plans:`);
    existingPlans.forEach((p) => console.log(`  - ${p.title} (${p.id})`));
  }

  // Create test plans
  const testPlans = [
    {
      host_id: hostId,
      title: "Cata Privada de Vinos Naturales",
      description: "Una experiencia íntima de cata de vinos naturales chilenos, guiada por nuestro sommelier. Incluye 6 copas, tabla de quesos artesanales y pan de masa madre. Grupos de máximo 8 personas en nuestra bodega subterránea.",
      short_description: "6 copas, quesos artesanales, bodega subterránea. Máx 8 personas.",
      sala: "La Buena Mesa",
      location: "Barrio Italia, Santiago",
      price_clp: 45000,
      capacity: 8,
      duration_minutes: 120,
      image_url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=500&fit=crop",
      media_urls: [
        "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=500&fit=crop",
      ],
      is_nominal: true,
      time_slots: [
        { time: "19:00", capacity: 8 },
        { time: "21:30", capacity: 8 },
      ],
      status: "published",
      drop_number: 15,
      badges: ["this_week"],
      featured: true,
    },
    {
      host_id: hostId,
      title: "Trekking Nocturno Cajón del Maipo",
      description: "Caminata bajo las estrellas por senderos del Cajón del Maipo. Sin linternas, solo la luna. Incluye snack de montaña y bebida caliente al final del recorrido.",
      short_description: "Sin linternas. Luna llena y sendero ciego. Snack + bebida caliente.",
      sala: "Outdoor",
      location: "Cajón del Maipo",
      price_clp: 38000,
      capacity: 12,
      duration_minutes: 180,
      image_url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=500&fit=crop",
      media_urls: [
        "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop",
      ],
      is_nominal: false,
      time_slots: [
        { time: "20:00", capacity: 12 },
      ],
      status: "published",
      drop_number: 16,
      badges: ["last_seats"],
      featured: false,
    },
    {
      host_id: hostId,
      title: "Stand-up a Puerta Cerrada",
      description: "Un comediante. 20 sillas. Sin grabaciones. Una hora de humor crudo en un espacio íntimo de Bellavista.",
      short_description: "Un comediante. 20 sillas. Sin grabaciones.",
      sala: "Fiestas & Sesiones",
      location: "Bellavista, Santiago",
      price_clp: 25000,
      capacity: 20,
      duration_minutes: 90,
      image_url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=500&fit=crop",
      is_nominal: false,
      time_slots: null,
      status: "published",
      drop_number: 17,
      badges: ["small_group"],
      featured: false,
    },
  ];

  console.log("\nInserting test plans...");
  for (const plan of testPlans) {
    const { data, error } = await supabase
      .from("plans")
      .insert(plan)
      .select("id, title, price_clp")
      .single();

    if (error) {
      if (error.message.includes("duplicate")) {
        console.log(`  ⏭ "${plan.title}" already exists, skipping`);
      } else {
        console.error(`  ✗ Error inserting "${plan.title}":`, error.message);
      }
    } else {
      const priceWithFee = Math.round(data.price_clp * 1.1);
      console.log(`  ✓ "${data.title}" → $${priceWithFee.toLocaleString("es-CL")} (incl. 10%) → /checkout/${data.id}`);
    }
  }

  // List all published plans
  const { data: allPlans } = await supabase
    .from("plans")
    .select("id, title, price_clp, drop_number")
    .eq("status", "published")
    .order("drop_number", { ascending: false });

  console.log("\n━━━ All published plans ━━━");
  if (allPlans) {
    allPlans.forEach((p) => {
      const price = Math.round(p.price_clp * 1.1);
      console.log(`  DROP ${String(p.drop_number).padStart(3, "0")} | ${p.title} | $${price.toLocaleString("es-CL")} | /checkout/${p.id}`);
    });
  }

  // Get host slug
  const { data: hostData } = await supabase.from("hosts").select("slug").eq("id", hostId).single();
  if (hostData) {
    console.log(`\n━━━ Test URLs ━━━`);
    console.log(`  Host page:  /hosts/${hostData.slug}`);
    console.log(`  Landing:    / (Drops section will show these plans)`);
  }

  console.log("\nDone!");
}

seed().catch(console.error);
