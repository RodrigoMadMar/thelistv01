"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/supabase/types";
import { applyServiceFee } from "@/lib/pricing";

/* ── Sala configuration ── */
interface SalaConfig {
  name: string;
  description: string;
  image: string;
}

const salasConfig: SalaConfig[] = [
  {
    name: "La Buena Mesa",
    description: "Cenas, catas, vino, experiencias gastronómicas",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&h=400&fit=crop",
  },
  {
    name: "Bar & Vino",
    description: "Barras, listening bars, coctelería, noche lenta",
    image:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=500&h=400&fit=crop",
  },
  {
    name: "Arte & Experimental",
    description: "Cultura, performance, espacios autor",
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&h=400&fit=crop",
  },
  {
    name: "Fiestas & Sesiones",
    description: "Música, line-ups, noches",
    image:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=400&fit=crop",
  },
  {
    name: "Outdoor",
    description: "Escapadas, rutas, experiencias fuera de la ciudad",
    image:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=500&h=400&fit=crop",
  },
];

/* ── Experience type for sala cards ── */
interface SalaExperience {
  id: string;
  title: string;
  shortDescription: string;
  image: string;
  price: string;
  seats: number | null;
  dropNumber: number;
  location: string;
}

/* ── Fallback data (mirrors Drops fallback, grouped by sala) ── */
const fallbackExperiences: Record<string, SalaExperience[]> = {
  "La Buena Mesa": [
    {
      id: "014",
      title: "Private tasting",
      shortDescription: "Luz baja, 8 copas, un host obsesivo.",
      image:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
      price: "$49.500",
      seats: 3,
      dropNumber: 14,
      location: "Barrio Italia",
    },
  ],
  "Bar & Vino": [
    {
      id: "009",
      title: "Cena ciega",
      shortDescription: "No sabes qué comes. No sabes quién cocina. Confía.",
      image:
        "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop",
      price: "$68.200",
      seats: 6,
      dropNumber: 9,
      location: "Lastarria",
    },
  ],
  "Arte & Experimental": [
    {
      id: "012",
      title: "Cerámica en silencio",
      shortDescription: "2 horas. Sin música. Solo tus manos y el barro.",
      image:
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
      price: "$35.200",
      seats: 4,
      dropNumber: 12,
      location: "Providencia",
    },
  ],
  "Fiestas & Sesiones": [
    {
      id: "010",
      title: "Stand-up a puerta cerrada",
      shortDescription: "Un comediante. 20 sillas. Sin grabaciones.",
      image:
        "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=400&fit=crop",
      price: "$27.500",
      seats: 2,
      dropNumber: 10,
      location: "Bellavista",
    },
  ],
  Outdoor: [
    {
      id: "013",
      title: "Trekking nocturno",
      shortDescription: "Sin linternas. Luna llena y sendero ciego.",
      image:
        "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop",
      price: "$41.800",
      seats: 8,
      dropNumber: 13,
      location: "Cajón del Maipo",
    },
    {
      id: "011",
      title: "Kayak en los fiordos",
      shortDescription: "Tres días. Sin señal. Máximo 6 personas.",
      image:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
      price: "$308.000",
      seats: null,
      dropNumber: 11,
      location: "Aysén",
    },
  ],
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function Salas() {
  const [activeSala, setActiveSala] = useState<string | null>(null);
  const [experiencesBySala, setExperiencesBySala] =
    useState<Record<string, SalaExperience[]>>(fallbackExperiences);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── Fetch plans and group by sala ── */
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

        const grouped: Record<string, SalaExperience[]> = {};
        (data as Plan[]).forEach((plan) => {
          const sala = plan.sala;
          if (!grouped[sala]) grouped[sala] = [];
          grouped[sala].push({
            id: plan.id,
            title: plan.title,
            shortDescription:
              plan.short_description || plan.description?.slice(0, 100) || "",
            image:
              plan.image_url ||
              "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
            price:
              "$" + applyServiceFee(plan.price_clp).toLocaleString("es-CL"),
            seats: plan.capacity > 0 ? plan.capacity : null,
            dropNumber: plan.drop_number,
            location: plan.location,
          });
        });
        setExperiencesBySala(grouped);
      } catch {
        // Keep fallback data
      }
    }
    fetchPlans();
  }, []);

  /* ── Reset horizontal scroll when switching salas ── */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [activeSala]);

  const toggleSala = (name: string) => {
    setActiveSala((prev) => (prev === name ? null : name));
  };

  const openExperience = (id: string) => {
    window.dispatchEvent(new CustomEvent("openDrop", { detail: { id } }));
    document.getElementById("drops")?.scrollIntoView({ behavior: "smooth" });
  };

  const activeExperiences = activeSala
    ? experiencesBySala[activeSala] || []
    : [];

  return (
    <section
      id="salas"
      className="px-5 md:px-10 pb-[120px] max-w-[1320px] mx-auto"
    >
      {/* Divider */}
      <div className="h-px bg-brand mb-12" />

      {/* Header */}
      <div className="flex items-baseline justify-between mb-12">
        <h2 className="font-serif text-[28px] font-normal">Salas</h2>
        <span className="text-[10px] tracking-[0.15em] uppercase text-brand-smoke">
          Colecciones por energía
        </span>
      </div>

      {/* Sala cards grid — act as interactive tabs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {salasConfig.map((sala) => {
          const isActive = activeSala === sala.name;
          const count = (experiencesBySala[sala.name] || []).length;

          return (
            <button
              key={sala.name}
              onClick={() => toggleSala(sala.name)}
              className={`relative h-[200px] md:h-[280px] rounded-[10px] overflow-hidden cursor-pointer border transition-all duration-300 group text-left ${
                isActive
                  ? "border-brand-lime/40 -translate-y-[2px] shadow-[0_8px_40px_rgba(183,255,60,0.06)]"
                  : "border-brand hover:border-brand-hover hover:-translate-y-[2px]"
              }`}
            >
              {/* Background image */}
              <div className="absolute inset-0 group-hover:scale-[1.04] transition-transform duration-500">
                <Image
                  src={sala.image}
                  alt={sala.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 20vw"
                />
              </div>

              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 z-[1] transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-t from-brand-black/90 via-brand-black/50 to-brand-black/25"
                    : "bg-gradient-to-t from-brand-black/85 via-brand-black/30 to-brand-black/15"
                }`}
              />

              {/* Experience count badge */}
              {count > 0 && (
                <div className="absolute top-3 right-3 z-[2]">
                  <span
                    className={`px-[7px] py-[2px] rounded-full text-[9px] font-medium tracking-wider backdrop-blur-[12px] transition-colors duration-300 ${
                      isActive
                        ? "bg-brand-lime/15 text-brand-lime"
                        : "bg-brand-black/50 text-brand-smoke/60"
                    }`}
                  >
                    {count}
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 z-[2]">
                <div className="text-[9px] tracking-[0.15em] uppercase text-brand-smoke mb-[6px]">
                  Sala
                </div>
                <div className="font-serif text-xl md:text-2xl font-normal">
                  {sala.name}
                </div>
                <div className="text-[11px] text-brand-smoke mt-[6px] leading-[1.4]">
                  {sala.description}
                </div>
              </div>

              {/* Active indicator — glowing bottom line */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-[2px] z-[3] transition-all duration-300 ${
                  isActive
                    ? "bg-brand-lime opacity-100"
                    : "bg-transparent opacity-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* ── Expandable experiences panel ── */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${
          activeSala
            ? "max-h-[480px] opacity-100 mt-8"
            : "max-h-0 opacity-0 mt-0"
        }`}
      >
        <div className="pt-6 border-t border-brand-lime/10">
          {/* Panel header */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[10px] tracking-[0.15em] uppercase text-brand-lime font-medium">
              {activeSala}
            </span>
            <span className="flex-1 h-px bg-brand" />
            <span className="text-[10px] text-brand-smoke/40 mr-2">
              {activeExperiences.length}{" "}
              {activeExperiences.length === 1 ? "experiencia" : "experiencias"}
            </span>
            {activeSala && (
              <Link
                href={`/salas/${toSlug(activeSala)}`}
                className="flex items-center gap-1 text-[10px] tracking-[0.08em] uppercase text-brand-smoke hover:text-brand-lime transition-colors"
              >
                Ver todos
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            )}
          </div>

          {/* Horizontal scroll of experience tickets */}
          {activeExperiences.length > 0 ? (
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
            >
              {activeExperiences.map((exp, i) => (
                <article
                  key={exp.id}
                  onClick={() => openExperience(exp.id)}
                  className="flex-shrink-0 w-[300px] snap-start bg-brand-surface/80 border border-brand rounded-[12px] overflow-hidden cursor-pointer hover:border-brand-lime/20 hover:-translate-y-[2px] transition-all duration-300 group/card"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Image strip */}
                  <div className="relative w-full h-[150px]">
                    <Image
                      src={exp.image}
                      alt={exp.title}
                      fill
                      className="object-cover group-hover/card:scale-[1.03] transition-transform duration-500"
                      sizes="300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-black/60" />

                    {/* Drop badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-[3px] bg-brand-black/60 backdrop-blur-[8px] rounded-full text-[8px] font-medium tracking-[0.12em] uppercase text-brand-lime">
                        DROP {String(exp.dropNumber).padStart(3, "0")}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="absolute bottom-3 left-3">
                      <span className="text-[10px] text-brand-white/70">
                        {exp.location}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <h4 className="font-serif text-[17px] font-normal leading-[1.3] mb-1.5">
                      {exp.title}
                    </h4>
                    <p className="text-[11px] text-brand-smoke/60 leading-[1.5] line-clamp-2 mb-4">
                      {exp.shortDescription}
                    </p>

                    {/* Footer: price + seats + hover CTA */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[15px] font-normal text-brand-white">
                          {exp.price}
                        </span>
                        {exp.seats != null && (
                          <span
                            className={`text-[10px] ${exp.seats <= 3 ? "text-brand-lime" : "text-brand-smoke/40"}`}
                          >
                            {exp.seats} {exp.seats === 1 ? "cupo" : "cupos"}
                          </span>
                        )}
                      </div>
                      <span className="px-3 py-1.5 bg-brand-lime text-brand-black text-[9px] font-medium tracking-[0.08em] uppercase rounded-full opacity-0 group-hover/card:opacity-100 translate-x-2 group-hover/card:translate-x-0 transition-all duration-200">
                        Reservar
                      </span>
                    </div>
                  </div>
                </article>
              ))}

              {/* "More coming" ghost card */}
              <div className="flex-shrink-0 w-[300px] snap-start border border-dashed border-brand-smoke/10 rounded-[12px] flex items-center justify-center min-h-[290px]">
                <div className="text-center px-6">
                  <div className="text-[10px] tracking-[0.15em] uppercase text-brand-smoke/30 mb-2">
                    Próximamente
                  </div>
                  <p className="text-[12px] text-brand-smoke/20 leading-[1.5]">
                    Nuevas experiencias en preparación
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-[13px] text-brand-smoke/40 italic">
                Próximamente — nuevas experiencias en preparación
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
