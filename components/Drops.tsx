"use client";

import { useState, useEffect, useCallback } from "react";
import DropCard, { DropData } from "./DropCard";
import DropOverlay from "./DropOverlay";

const drops: DropData[] = [
  {
    id: "014",
    dropNumber: 14,
    title: "Private tasting",
    description: "Luz baja, 8 copas, un host obsesivo.",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
    date: "Vie 7 Mar",
    time: "21:00",
    zone: "Barrio Italia",
    status: "last_seats",
    sala: "La Buena Mesa",
    seats: 3,
    price: "$45.000",
  },
  {
    id: "013",
    dropNumber: 13,
    title: "Trekking nocturno",
    description: "Sin linternas. Luna llena y sendero ciego.",
    image:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop",
    date: "Sáb 8 Mar",
    time: "20:30",
    zone: "Cajón del Maipo",
    status: "members_first",
    sala: "Outdoor",
    seats: 8,
    price: "$38.000",
  },
  {
    id: "012",
    dropNumber: 12,
    title: "Cerámica en silencio",
    description: "2 horas. Sin música. Solo tus manos y el barro.",
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
    date: "Dom 9 Mar",
    time: "11:00",
    zone: "Providencia",
    status: "this_week",
    sala: "Arte & Experimental",
    seats: 4,
    price: "$32.000",
  },
  {
    id: "011",
    dropNumber: 11,
    title: "Kayak en los fiordos",
    description: "Tres días. Sin señal. Máximo 6 personas.",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
    date: "Mar 7 — 9",
    zone: "Aysén",
    status: "sold_out",
    sala: "Outdoor",
    seats: null,
    price: "$280.000",
  },
  {
    id: "010",
    dropNumber: 10,
    title: "Stand-up a puerta cerrada",
    description: "Un comediante. 20 sillas. Sin grabaciones.",
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=400&fit=crop",
    date: "Jue 13 Mar",
    time: "22:00",
    zone: "Bellavista",
    status: "last_seats",
    sala: "Fiestas & Sesiones",
    seats: 2,
    price: "$25.000",
  },
  {
    id: "009",
    dropNumber: 9,
    title: "Cena ciega",
    description: "No sabes qué comes. No sabes quién cocina. Confía.",
    image:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop",
    date: "Sáb 15 Mar",
    time: "21:00",
    zone: "Lastarria",
    status: "small_group",
    sala: "Bar & Vino",
    seats: 6,
    price: "$62.000",
  },
];

export default function Drops() {
  const [activeDrop, setActiveDrop] = useState<DropData | null>(null);

  /* ── Read ?drop=XXX on mount ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dropId = params.get("drop");
    if (dropId) {
      const found = drops.find((d) => d.id === dropId);
      if (found) setActiveDrop(found);
    }
  }, []);

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
