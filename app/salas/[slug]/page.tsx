"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/supabase/types";
import { applyServiceFee, formatCLP } from "@/lib/pricing";
import DropOverlay from "@/components/DropOverlay";
import type { DropData, DropStatus } from "@/components/DropCard";
import Footer from "@/components/Footer";

/* ── Sala catalogue ── */
interface SalaInfo {
  name: string;
  slug: string;
  description: string;
  tagline: string;
  image: string;
}

const SALAS: SalaInfo[] = [
  {
    name: "La Buena Mesa",
    slug: "la-buena-mesa",
    description: "Cenas, catas, vino, experiencias gastronómicas",
    tagline: "Donde cada plato cuenta una historia",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=600&fit=crop",
  },
  {
    name: "Bar & Vino",
    slug: "bar-vino",
    description: "Barras, listening bars, coctelería, noche lenta",
    tagline: "El arte de la pausa",
    image:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200&h=600&fit=crop",
  },
  {
    name: "Arte & Experimental",
    slug: "arte-experimental",
    description: "Cultura, performance, espacios autor",
    tagline: "Lo que no cabe en un museo",
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=600&fit=crop",
  },
  {
    name: "Fiestas & Sesiones",
    slug: "fiestas-sesiones",
    description: "Música, line-ups, noches",
    tagline: "Sonido, sudor y silencio después",
    image:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=600&fit=crop",
  },
  {
    name: "Outdoor",
    slug: "outdoor",
    description: "Escapadas, rutas, experiencias fuera de la ciudad",
    tagline: "La ciudad queda atrás",
    image:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&h=600&fit=crop",
  },
];

/* ── Plan → DropData for overlay ── */
function planToDropData(plan: Plan): DropData {
  const firstBadge = plan.badges?.[0] as DropStatus | undefined;
  const media = plan.media_urls?.map((url) => ({
    type: "image" as const,
    src: url,
  }));
  const customerPrice = applyServiceFee(plan.price_clp);

  return {
    id: plan.id,
    dropNumber: plan.drop_number,
    title: plan.title,
    description: plan.short_description || plan.description,
    image:
      plan.image_url ||
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
    media,
    zone: plan.location,
    status: firstBadge || "default",
    sala: plan.sala,
    seats: plan.capacity > 0 ? plan.capacity : null,
    price: formatCLP(customerPrice),
    unitPrice: customerPrice,
    isNominal: plan.is_nominal,
    timeSlots: plan.time_slots,
  };
}

/* ── Experience card used inside the grid ── */
function ExperienceCard({
  plan,
  salaImage,
  onOpen,
}: {
  plan: Plan;
  salaImage: string;
  onOpen: () => void;
}) {
  const customerPrice = applyServiceFee(plan.price_clp);

  return (
    <article
      onClick={onOpen}
      className="group cursor-pointer bg-brand-surface border border-brand rounded-[12px] overflow-hidden hover:border-brand-lime/20 hover:-translate-y-[3px] transition-all duration-300"
    >
      <div className="relative h-[200px] md:h-[240px]">
        <Image
          src={plan.image_url || salaImage}
          alt={plan.title}
          fill
          className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-black/50" />

        <div className="absolute top-3 left-3">
          <span className="px-2 py-[3px] bg-brand-black/60 backdrop-blur-[8px] rounded-full text-[8px] font-medium tracking-[0.12em] uppercase text-brand-lime">
            DROP {String(plan.drop_number).padStart(3, "0")}
          </span>
        </div>

        <div className="absolute bottom-3 right-3">
          <span className="text-[10px] text-brand-white/60">
            {plan.location}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-serif text-[20px] font-normal leading-[1.25] mb-2">
          {plan.title}
        </h3>
        <p className="text-[12px] text-brand-smoke/60 leading-[1.6] line-clamp-2 mb-4">
          {plan.short_description || plan.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-brand">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-normal text-brand-white">
              {formatCLP(customerPrice)}
            </span>
            {plan.capacity > 0 && (
              <span
                className={`text-[10px] ${plan.capacity <= 5 ? "text-brand-lime" : "text-brand-smoke/40"}`}
              >
                {plan.capacity} cupos
              </span>
            )}
          </div>
          <span className="px-4 py-1.5 bg-brand-lime text-brand-black text-[9px] font-medium tracking-[0.08em] uppercase rounded-full opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200">
            Reservar
          </span>
        </div>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════
   Sala detail page
   ══════════════════════════════════════════════ */
export default function SalaPage() {
  const params = useParams();
  const slug = params.slug as string;
  const sala = SALAS.find((s) => s.slug === slug);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeDrop, setActiveDrop] = useState<DropData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Page title ── */
  useEffect(() => {
    if (sala) document.title = `${sala.name} — thelist.cl`;
  }, [sala]);

  /* ── Fetch published plans for this sala ── */
  useEffect(() => {
    if (!sala) return;
    async function fetchPlans() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("plans")
          .select("*")
          .eq("status", "published")
          .eq("sala", sala!.name)
          .order("drop_number", { ascending: false });

        if (!error && data) setPlans(data as Plan[]);
      } catch {
        /* network error — keep empty */
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, [sala]);

  const openDrop = useCallback(
    (plan: Plan) => setActiveDrop(planToDropData(plan)),
    [],
  );
  const closeDrop = useCallback(() => setActiveDrop(null), []);

  /* ── 404 ── */
  if (!sala) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-brand-smoke text-lg">Sala no encontrada</p>
        <Link
          href="/#salas"
          className="text-brand-lime text-sm underline hover:text-brand-lime/80 transition-colors"
        >
          Volver a las salas
        </Link>
      </div>
    );
  }

  const featured = plans[0];
  const rest = plans.slice(1);
  const leftCol = rest.filter((_, i) => i % 2 === 0);
  const rightCol = rest.filter((_, i) => i % 2 !== 0);

  return (
    <div className="min-h-screen">
      {/* ── Top bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] h-16 flex items-center justify-between px-5 md:px-10 border-b border-brand bg-brand-overlay backdrop-blur-[32px]">
        <Link
          href="/"
          className="font-serif text-lg font-medium tracking-wide text-brand-white"
        >
          thelist<span className="text-brand-smoke font-normal">.</span>cl
        </Link>
        <Link
          href="/#salas"
          className="flex items-center gap-2 text-[11px] font-normal tracking-[0.1em] uppercase text-brand-smoke hover:text-brand-white transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Todas las salas
        </Link>
      </nav>

      {/* ── Cinematic hero ── */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] flex items-end">
        <div className="absolute inset-0">
          <Image
            src={sala.image}
            alt={sala.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/60 to-brand-black/20" />
        </div>

        <div className="relative z-10 px-5 md:px-10 pb-12 max-w-[1320px] mx-auto w-full">
          <div className="text-[10px] tracking-[0.2em] uppercase text-brand-lime mb-3 font-medium opacity-0 animate-fade-in animation-delay-200">
            Sala
          </div>
          <h1 className="font-serif text-[clamp(40px,6vw,72px)] font-normal leading-[1.05] text-brand-white mb-4 opacity-0 animate-fade-up animation-delay-400">
            {sala.name}
          </h1>
          <p className="text-[16px] font-light text-brand-smoke/80 max-w-[480px] leading-[1.6] mb-2 opacity-0 animate-fade-up animation-delay-600">
            {sala.tagline}
          </p>
          <p className="text-[13px] text-brand-smoke/50 opacity-0 animate-fade-up animation-delay-600">
            {sala.description}
          </p>
          {!loading && (
            <div className="mt-6 opacity-0 animate-fade-in animation-delay-800">
              <span className="px-3 py-1 bg-brand-lime/10 border border-brand-lime/20 rounded-full text-[10px] tracking-[0.1em] uppercase text-brand-lime font-medium">
                {plans.length}{" "}
                {plans.length === 1 ? "experiencia" : "experiencias"}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Experiences ── */}
      <section className="px-5 md:px-10 max-w-[1320px] mx-auto py-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-brand-lime/30 border-t-brand-lime rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          /* ── Empty state ── */
          <div className="text-center py-20">
            <div className="text-[10px] tracking-[0.15em] uppercase text-brand-smoke/30 mb-3">
              Próximamente
            </div>
            <p className="text-[15px] text-brand-smoke/40 font-light max-w-[380px] mx-auto leading-[1.6]">
              Estamos preparando experiencias increíbles para esta sala.
            </p>
            <Link
              href="/#salas"
              className="inline-block mt-8 text-[11px] tracking-[0.08em] uppercase text-brand-lime hover:text-brand-lime/80 transition-colors"
            >
              Explorar otras salas
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ── Featured card (first plan) ── */}
            {featured && (
              <article
                onClick={() => openDrop(featured)}
                className="group cursor-pointer bg-brand-surface border border-brand rounded-[14px] overflow-hidden hover:border-brand-lime/20 transition-all duration-300 opacity-0 animate-fade-up animation-delay-200"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
                  {/* Large image */}
                  <div className="relative h-[280px] lg:h-[400px]">
                    <Image
                      src={featured.image_url || sala.image}
                      alt={featured.title}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-black/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-brand-surface/90" />

                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-[10px] py-1 bg-brand-black/60 backdrop-blur-[8px] rounded-full text-[9px] font-medium tracking-[0.1em] uppercase text-brand-lime">
                        DROP {String(featured.drop_number).padStart(3, "0")}
                      </span>
                      <span className="px-[10px] py-1 bg-brand-lime/15 backdrop-blur-[8px] rounded-full text-[9px] font-medium tracking-[0.1em] uppercase text-brand-lime">
                        Destacado
                      </span>
                    </div>
                  </div>

                  {/* Info panel */}
                  <div className="p-6 lg:p-10 lg:flex lg:flex-col lg:justify-center">
                    <div className="text-[10px] tracking-[0.12em] uppercase text-brand-smoke/50 mb-3">
                      {featured.location}
                    </div>
                    <h2 className="font-serif text-[28px] lg:text-[34px] font-normal leading-[1.15] mb-4">
                      {featured.title}
                    </h2>
                    <p className="text-[14px] font-light text-brand-smoke/70 leading-[1.65] mb-6 max-w-[420px]">
                      {featured.short_description || featured.description}
                    </p>

                    <div className="flex items-center gap-4 mb-6 text-[11px] text-brand-smoke/50">
                      {featured.capacity > 0 && (
                        <span
                          className={
                            featured.capacity <= 5 ? "text-brand-lime" : ""
                          }
                        >
                          {featured.capacity} cupos
                        </span>
                      )}
                      {featured.duration_minutes && (
                        <span>{featured.duration_minutes} min</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[24px] font-normal text-brand-white">
                        {formatCLP(applyServiceFee(featured.price_clp))}
                      </span>
                      <span className="px-5 py-2.5 bg-brand-lime text-brand-black text-[11px] font-medium tracking-[0.08em] uppercase rounded-full group-hover:-translate-y-px transition-transform duration-200">
                        Reservar
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* ── Staggered 2-col grid (rest of plans) ── */}
            {rest.length > 0 && (
              <>
                {/* Desktop: staggered columns */}
                <div className="hidden md:flex gap-5">
                  <div className="flex-1 space-y-5">
                    {leftCol.map((plan) => (
                      <ExperienceCard
                        key={plan.id}
                        plan={plan}
                        salaImage={sala.image}
                        onOpen={() => openDrop(plan)}
                      />
                    ))}
                  </div>
                  <div className="flex-1 space-y-5 pt-14">
                    {rightCol.map((plan) => (
                      <ExperienceCard
                        key={plan.id}
                        plan={plan}
                        salaImage={sala.image}
                        onOpen={() => openDrop(plan)}
                      />
                    ))}
                  </div>
                </div>

                {/* Mobile: single column */}
                <div className="md:hidden space-y-5">
                  {rest.map((plan) => (
                    <ExperienceCard
                      key={plan.id}
                      plan={plan}
                      salaImage={sala.image}
                      onOpen={() => openDrop(plan)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Other salas ── */}
      <section className="px-5 md:px-10 max-w-[1320px] mx-auto pb-16">
        <div className="h-px bg-brand mb-10" />
        <div className="flex items-baseline justify-between mb-8">
          <h3 className="font-serif text-[22px] font-normal">Otras salas</h3>
          <Link
            href="/#salas"
            className="text-[10px] tracking-[0.12em] uppercase text-brand-smoke hover:text-brand-white transition-colors"
          >
            Ver todas
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-4">
          {SALAS.filter((s) => s.slug !== slug).map((s) => (
            <Link
              key={s.slug}
              href={`/salas/${s.slug}`}
              className="flex-shrink-0 relative w-[220px] h-[170px] rounded-[10px] overflow-hidden border border-brand hover:border-brand-hover hover:-translate-y-[2px] transition-all duration-300 group"
            >
              <Image
                src={s.image}
                alt={s.name}
                fill
                className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                sizes="220px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-black/85 via-brand-black/30 to-brand-black/15" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-[9px] tracking-[0.12em] uppercase text-brand-smoke mb-1">
                  Sala
                </div>
                <div className="font-serif text-[16px]">{s.name}</div>
                <div className="text-[10px] text-brand-smoke/50 mt-1">
                  {s.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />

      {/* ── Drop overlay ── */}
      <DropOverlay drop={activeDrop} onClose={closeDrop} />
    </div>
  );
}
