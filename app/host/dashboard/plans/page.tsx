import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RequestChangeButton from "@/components/RequestChangeButton";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "text-brand-smoke border-brand-smoke/30" },
  published: { label: "Publicado", className: "text-brand-lime border-brand-lime/30" },
  paused: { label: "Pausado", className: "text-brand-silver border-brand-silver/30" },
  archived: { label: "Archivado", className: "text-brand-smoke/50 border-brand-smoke/20" },
};

const DAY_LABELS: Record<string, string> = {
  lunes: "Lunes", martes: "Martes", miércoles: "Miércoles", jueves: "Jueves",
  viernes: "Viernes", sábado: "Sábado", domingo: "Domingo",
};

const BADGE_LABELS: Record<string, string> = {
  last_seats: "Últimos cupos",
  members_first: "Miembros primero",
  small_group: "Grupo pequeño",
  this_week: "Esta semana",
  sold_out: "Agotado",
};

export default async function HostPlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: host } = await supabase.from("hosts").select("id").eq("profile_id", user.id).single();

  const { data: plans } = host
    ? await supabase.from("plans").select("*").eq("host_id", host.id).order("drop_number", { ascending: false })
    : { data: [] };

  // Get reservation counts per plan
  const planIds = (plans || []).map((p) => p.id);
  let reservationCounts: Record<string, number> = {};
  if (planIds.length > 0) {
    const { data: reservations } = await supabase
      .from("reservations")
      .select("plan_id, status")
      .in("plan_id", planIds)
      .in("status", ["pending", "confirmed", "completed"]);

    if (reservations) {
      reservationCounts = reservations.reduce((acc, r) => {
        acc[r.plan_id] = (acc[r.plan_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-[960px]">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-[28px] font-normal">Mis planes</h1>
        <a href="/host/apply" className="px-5 py-2.5 border border-brand rounded-full text-[12px] text-brand-smoke hover:text-brand-white hover:border-brand-smoke transition-all">
          Nueva postulación
        </a>
      </div>

      {!plans || plans.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-brand-smoke text-[14px] mb-4">No tienes planes aún.</p>
          <a href="/host/apply" className="text-[12px] text-brand-white hover:text-brand-lime transition-colors">
            Postula tu primera experiencia
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const badge = STATUS_BADGE[plan.status] || STATUS_BADGE.draft;
            const days = (plan.days_of_week as string[]) || [];
            const schedule = (plan.schedule as Array<{ start: string; end: string }>) || [];
            const badges = (plan.badges as string[]) || [];
            const mediaUrls = (plan.media_urls as string[]) || [];
            const resCount = reservationCounts[plan.id] || 0;

            return (
              <div key={plan.id} className="p-5 rounded-xl border border-brand bg-brand-surface">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-brand-smoke/50">DROP {String(plan.drop_number).padStart(3, "0")}</span>
                      <span className={`px-2.5 py-0.5 border rounded-full text-[10px] uppercase tracking-[0.08em] shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
                      {plan.featured && (
                        <span className="px-2.5 py-0.5 border border-brand-lime/30 rounded-full text-[10px] uppercase tracking-[0.08em] text-brand-lime shrink-0">
                          Destacado
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-[20px] font-normal text-brand-white">{plan.title}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[18px] text-brand-white">${plan.price_clp?.toLocaleString("es-CL")}</div>
                    <div className="text-[11px] text-brand-smoke">por persona</div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[13px] text-brand-smoke leading-relaxed mb-4">{plan.description}</p>

                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-white/[0.02]">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-1">Sala</div>
                    <div className="text-[13px] text-brand-white">{plan.sala}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02]">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-1">Ubicación</div>
                    <div className="text-[13px] text-brand-white">{plan.location}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02]">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-1">Capacidad</div>
                    <div className="text-[13px] text-brand-white">{plan.capacity} cupos</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02]">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-1">Reservas</div>
                    <div className="text-[13px] text-brand-white">{resCount}</div>
                  </div>
                </div>

                {/* Duration */}
                {plan.duration_minutes && (
                  <div className="text-[12px] text-brand-smoke mb-3">
                    Duración: {plan.duration_minutes} minutos
                  </div>
                )}

                {/* Schedule */}
                {(days.length > 0 || schedule.length > 0) && (
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-2">Horarios</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {days.map((d) => (
                        <span key={d} className="px-2 py-1 bg-white/[0.04] rounded text-[11px] text-brand-smoke">
                          {DAY_LABELS[d] || d}
                        </span>
                      ))}
                      {schedule.map((s, i) => (
                        <span key={i} className="text-[11px] text-brand-smoke/70">
                          {s.start} – {s.end}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Badges */}
                {badges.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-2">Etiquetas</div>
                    <div className="flex flex-wrap gap-1.5">
                      {badges.map((b) => (
                        <span key={b} className="px-2 py-0.5 bg-brand-lime/10 border border-brand-lime/20 rounded-full text-[10px] text-brand-lime">
                          {BADGE_LABELS[b] || b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media */}
                {mediaUrls.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-2">Multimedia</div>
                    <div className="flex flex-wrap gap-1.5">
                      {mediaUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand-smoke hover:text-brand-white transition-colors underline underline-offset-2">
                          Archivo {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-brand-smoke/40 pt-3 border-t border-brand mt-3">
                  <span>Creado: {new Date(plan.created_at).toLocaleDateString("es-CL")}</span>
                  {plan.published_at && <span>Publicado: {new Date(plan.published_at).toLocaleDateString("es-CL")}</span>}
                  <span>Actualizado: {new Date(plan.updated_at).toLocaleDateString("es-CL")}</span>
                </div>

                {/* Request change */}
                <RequestChangeButton planId={plan.id} planTitle={plan.title} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
