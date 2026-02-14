"use client";

import { useState, useEffect, useCallback } from "react";
import DropCard, { DropData } from "./DropCard";
import DropOverlay from "./DropOverlay";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/supabase/types";
import { applyServiceFee } from "@/lib/pricing";

/* ── Static fallback data (original hardcoded drops) ── */
const fallbackDrops: DropData[] = [
  {
    id: "014",
    dropNumber: 14,
    title: "Private tasting",
    description: "Luz baja, 8 copas, un host obsesivo.",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
    media: [
      { type: "image", src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=500&fit=crop" },
      { type: "image", src: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=500&fit=crop" },
      { type: "image", src: "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=800&h=500&fit=crop" },
      { type: "video", src: "https://videos.pexels.com/video-files/5529530/5529530-hd_1920_1080_25fps.mp4", poster: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=500&fit=crop" },
    ],
    date: "Vie 7 Mar",
    time: "21:00",
    zone: "Barrio Italia",
    status: "last_seats",
    sala: "La Buena Mesa",
    seats: 3,
    price: "$49.500",
    unitPrice: 49500,
  },
  {
    id: "013",
    dropNumber: 13,
    title: "Trekking nocturno",
    description: "Sin linternas. Luna llena y sendero ciego.",
    image:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop",
    media: [
      { type: "image", src: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=500&fit=crop" },
      { type: "image", src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop" },
      { type: "image", src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=500&fit=crop" },
    ],
    date: "Sáb 8 Mar",
    time: "20:30",
    zone: "Cajón del Maipo",
    status: "members_first",
    sala: "Outdoor",
    seats: 8,
    price: "$41.800",
    unitPrice: 41800,
  },
  {
    id: "012",
    dropNumber: 12,
    title: "Cerámica en silencio",
    description: "2 horas. Sin música. Solo tus manos y el barro.",
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
    media: [
      { type: "image", src: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=500&fit=crop" },
      { type: "image", src: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=500&fit=crop" },
      { type: "video", src: "https://videos.pexels.com/video-files/5538974/5538974-hd_1920_1080_30fps.mp4", poster: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=500&fit=crop" },
    ],
    date: "Dom 9 Mar",
    time: "11:00",
    zone: "Providencia",
    status: "this_week",
    sala: "Arte & Experimental",
    seats: 4,
    price: "$35.200",
    unitPrice: 35200,
  },
  {
    id: "011",
    dropNumber: 11,
    title: "Kayak en los fiordos",
    description: "Tres días. Sin señal. Máximo 6 personas.",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
    media: [
      { type: "image", src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop" },
      { type: "image", src: "https://images.unsplash.com/photo-1473181488821-2d23949a045a?w=800&h=500&fit=crop" },
    ],
    date: "Mar 7 — 9",
    zone: "Aysén",
    status: "sold_out",
    sala: "Outdoor",
    seats: null,
    price: "$308.000",
    unitPrice: 308000,
  },
  {
    id: "010",
    dropNumber: 10,
    title: "Stand-up a puerta cerrada",
    description: "Un comediante. 20 sillas. Sin grabaciones.",
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=400&fit=crop",
    media: [
      { type: "image", src: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=500&fit=crop" },
      { type: "image", src: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&h=500&fit=crop" },
    ],
    date: "Jue 13 Mar",
    time: "22:00",
    zone: "Bellavista",
    status: "last_seats",
    sala: "Fiestas & Sesiones",
    seats: 2,
    price: "$27.500",
    unitPrice: 27500,
  },
  {
    id: "009",
    dropNumber: 9,
    title: "Cena ciega",
    description: "No sabes qué comes. No sabes quién cocina. Confía.",
    image:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop",
    media: [
      { type: "image", src: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&h=500&fit=crop" },
      { type: "image", src: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=500&fit=crop" },
      { type: "image", src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop" },
    ],
    date: "Sáb 15 Mar",
    time: "21:00",
    zone: "Lastarria",
    status: "small_group",
    sala: "Bar & Vino",
    seats: 6,
    price: "$68.200",
    unitPrice: 68200,
  },
];

/* ── Convert Plan from Supabase to DropData for the cards ── */
function planToDropData(plan: Plan): DropData {
  const firstBadge = plan.badges?.[0] as DropData["status"] | undefined;

  const media = plan.media_urls?.map((url) => ({
    type: "image" as const,
    src: url,
  }));

  const customerPrice = applyServiceFee(plan.price_clp);
  const priceStr = "$" + customerPrice.toLocaleString("es-CL");

  let time: string | undefined;
  if (plan.schedule && Array.isArray(plan.schedule) && plan.schedule.length > 0) {
    const slot = plan.schedule[0] as { start?: string };
    time = slot.start;
  }

  return {
    id: plan.id,
    dropNumber: plan.drop_number,
    title: plan.title,
    description: plan.short_description || plan.description,
    image: plan.image_url || "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
    media,
    time,
    zone: plan.location,
    status: firstBadge || "default",
    sala: plan.sala,
    seats: plan.capacity > 0 ? plan.capacity : null,
    price: priceStr,
    unitPrice: customerPrice,
    isNominal: plan.is_nominal,
    timeSlots: plan.time_slots,
  };
}

export default function Drops() {
  const [drops, setDrops] = useState<DropData[]>(fallbackDrops);
  const [activeDrop, setActiveDrop] = useState<DropData | null>(null);

  /* ── Fetch published plans from Supabase ── */
  useEffect(() => {
    async function fetchPlans() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("plans")
          .select("*")
          .eq("status", "published")
          .order("drop_number", { ascending: false });

        if (error || !data || data.length === 0) return;

        setDrops(data.map((plan) => planToDropData(plan as Plan)));
      } catch {
        // Supabase not configured or network error — keep fallback data
      }
    }

    fetchPlans();
  }, []);

  /* ── Read ?drop=XXX on mount ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dropId = params.get("drop");
    if (dropId) {
      const found = drops.find((d) => d.id === dropId);
      if (found) setActiveDrop(found);
    }
  }, [drops]);

  /* ── Listen for openDrop events from other components (e.g. Salas) ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      const found = drops.find((d) => d.id === id);
      if (found) {
        setActiveDrop(found);
        const url = new URL(window.location.href);
        url.searchParams.set("drop", found.id);
        window.history.replaceState({}, "", url.toString());
      }
    };
    window.addEventListener("openDrop", handler);
    return () => window.removeEventListener("openDrop", handler);
  }, [drops]);

  const openDrop = useCallback((drop: DropData) => {
    setActiveDrop(drop);
    const url = new URL(window.location.href);
    url.searchParams.set("drop", drop.id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const closeDrop = useCallback(() => {
    setActiveDrop(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("drop");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const activeCount = drops.filter((d) => d.status !== "sold_out").length;

  return (
    <section
      id="drops"
      className="py-[100px] px-5 md:px-10 max-w-[1320px] mx-auto"
    >
      {/* Divider */}
      <div className="h-px bg-brand-silver/10 mb-12" />

      {/* Header */}
      <div className="flex items-baseline justify-between mb-12">
        <h2 className="font-serif text-[28px] font-normal">Drops</h2>
        <span className="text-[10px] tracking-[0.15em] uppercase text-brand-smoke">
          Esta semana · {activeCount} activos
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drops.map((drop) => (
          <DropCard key={drop.id} drop={drop} onClick={() => openDrop(drop)} />
        ))}
      </div>

      {/* Overlay */}
      <DropOverlay drop={activeDrop} onClose={closeDrop} />
    </section>
  );
}
