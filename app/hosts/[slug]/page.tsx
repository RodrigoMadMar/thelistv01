import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";

export default async function HostPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: host } = await supabase
    .from("hosts")
    .select("*, profiles:profile_id(full_name)")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!host) notFound();

  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("host_id", host.id)
    .eq("status", "published")
    .order("drop_number", { ascending: false });

  const planCount = plans?.length || 0;
  const profileData = host.profiles as Record<string, string> | null;

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Navbar mini */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] h-16 flex items-center px-5 md:px-10 border-b border-brand bg-brand-overlay backdrop-blur-[32px]">
        <a href="/" className="font-serif text-lg font-medium tracking-wide text-brand-white">
          thelist<span className="text-brand-smoke font-normal">.</span>cl
        </a>
      </nav>

      {/* Cover */}
      <div className="relative w-full h-[300px] mt-16">
        {host.cover_url ? (
          <Image src={host.cover_url} alt={host.business_name} fill className="object-cover" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-brand-elevated to-brand-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-[800px] mx-auto px-5 md:px-10 -mt-20 relative z-10 pb-20">
        {/* Logo / Avatar */}
        {host.logo_url && (
          <div className="w-20 h-20 rounded-full border-2 border-brand-black overflow-hidden mb-5">
            <Image src={host.logo_url} alt="" width={80} height={80} className="object-cover" />
          </div>
        )}

        {/* Name */}
        <h1 className="font-serif text-[clamp(28px,4vw,40px)] font-normal leading-[1.2] mb-2">
          {host.business_name}
        </h1>
        {host.tagline && (
          <p className="text-[15px] text-brand-smoke mb-5">{host.tagline}</p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-8">
          {host.location && (
            <span className="px-3 py-1.5 border border-brand rounded-full text-[11px] text-brand-smoke">
              {host.location}
            </span>
          )}
          <span className="px-3 py-1.5 border border-brand-lime/20 rounded-full text-[11px] text-brand-lime">
            Curado por THE LIST
          </span>
          <span className="px-3 py-1.5 border border-brand rounded-full text-[11px] text-brand-smoke">
            {planCount} {planCount === 1 ? "plan" : "planes"} publicados
          </span>
        </div>

        {/* Mock buttons */}
        <div className="flex gap-3 mb-10">
          <button className="px-6 py-2.5 rounded-full bg-brand-white text-brand-black text-[12px] font-medium uppercase tracking-[0.08em] cursor-default">
            Seguir
          </button>
          <button className="px-6 py-2.5 rounded-full border border-brand text-brand-smoke text-[12px] uppercase tracking-[0.08em] cursor-default">
            Compartir
          </button>
        </div>

        {/* Trust signals */}
        <div className="mb-10 p-5 rounded-xl border border-brand bg-brand-surface">
          <h3 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-4">Señales de confianza</h3>
          <div className="grid grid-cols-2 gap-3">
            {["Grupos reducidos", "Experiencia exclusiva", "Host verificado", "Cupos reales"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-[13px] text-brand-smoke">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B7FF3C" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        {host.bio_short && (
          <div className="mb-10">
            <h3 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-3">Sobre {host.business_name}</h3>
            <p className="text-[14px] text-brand-smoke leading-[1.7] mb-3">{host.bio_short}</p>
            {host.bio_extended && (
              <details className="group">
                <summary className="text-[12px] text-brand-smoke/60 hover:text-brand-white cursor-pointer transition-colors">
                  Leer más
                </summary>
                <p className="text-[14px] text-brand-smoke leading-[1.7] mt-3">{host.bio_extended}</p>
              </details>
            )}
          </div>
        )}

        {/* Plans */}
        {plans && plans.length > 0 && (
          <div className="mb-10">
            <h3 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-5">
              Planes de {host.business_name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-brand-surface border border-brand rounded-[10px] overflow-hidden hover:border-brand-hover hover:-translate-y-[2px] transition-all">
                  {plan.image_url && (
                    <div className="relative w-full h-[180px]">
                      <Image src={plan.image_url} alt={plan.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                      <div className="absolute inset-0 bg-gradient-to-b from-brand-black/10 to-brand-black/50" />
                      <div className="absolute top-3 left-3">
                        <span className="px-[10px] py-1 bg-brand-black/65 backdrop-blur-[12px] rounded-full text-[9px] font-medium tracking-[0.1em] uppercase text-brand-lime">
                          PLAN
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-[18px]">
                    <h4 className="font-serif text-[17px] font-normal mb-1">{plan.title}</h4>
                    <div className="text-[11px] text-brand-smoke mb-1">
                      DROP {String(plan.drop_number).padStart(3, "0")} · {plan.location}
                    </div>
                    {plan.short_description && (
                      <p className="text-[12px] text-brand-smoke/60 line-clamp-1">{plan.short_description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Qué puedes esperar */}
        <div className="mb-10 p-5 rounded-xl border border-brand bg-brand-surface">
          <h3 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-4">Qué puedes esperar</h3>
          <div className="space-y-2">
            {["Grupos reducidos", "Experiencia exclusiva", "Host verificado", "Cupos reales"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-[13px] text-brand-smoke">
                <span className="w-1 h-1 rounded-full bg-brand-smoke/40" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Reviews placeholder */}
        <div className="text-center py-10 border-t border-brand">
          <p className="text-[13px] text-brand-smoke/50">Las reseñas estarán disponibles próximamente.</p>
        </div>
      </div>
    </div>
  );
}
