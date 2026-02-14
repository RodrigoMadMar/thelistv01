import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "text-brand-smoke" },
  confirmed: { label: "Confirmada", className: "text-brand-lime" },
  completed: { label: "Completada", className: "text-brand-silver" },
  cancelled: { label: "Cancelada", className: "text-red-400/70" },
};

const DAY_LABELS: Record<string, string> = {
  lunes: "Lun", martes: "Mar", miércoles: "Mié", jueves: "Jue",
  viernes: "Vie", sábado: "Sáb", domingo: "Dom",
};

export default async function HostDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: host } = await supabase.from("hosts").select("*").eq("profile_id", user.id).single();

  const hostId = host?.id;

  // Today's date in YYYY-MM-DD format
  const now = new Date();
  const todayISO = now.toISOString().split("T")[0];

  // Stats
  const { count: activePlans } = hostId
    ? await supabase.from("plans").select("*", { count: "exact", head: true }).eq("host_id", hostId).eq("status", "published")
    : { count: 0 };

  const { count: totalReservations } = hostId
    ? await supabase.from("reservations").select("*, plans!inner(*)", { count: "exact", head: true }).eq("plans.host_id", hostId)
    : { count: 0 };

  const { count: confirmedReservations } = hostId
    ? await supabase.from("reservations").select("*, plans!inner(*)", { count: "exact", head: true }).eq("plans.host_id", hostId).eq("status", "confirmed")
    : { count: 0 };

  // Today's reservations
  let todayReservations: Array<Record<string, unknown>> = [];
  let todayPeople = 0;
  if (hostId) {
    const { data: plans } = await supabase.from("plans").select("id, title").eq("host_id", hostId);
    if (plans && plans.length > 0) {
      const planIds = plans.map((p) => p.id);
      const { data } = await supabase
        .from("reservations")
        .select("*, profiles:user_id(full_name, email)")
        .in("plan_id", planIds)
        .eq("date", todayISO)
        .in("status", ["pending", "confirmed"])
        .order("time_slot", { ascending: true });

      todayReservations = (data || []).map((r) => ({
        ...r,
        plan_title: plans.find((p) => p.id === r.plan_id)?.title || "—",
      }));
      todayPeople = todayReservations.reduce((sum, r) => sum + ((r.num_people as number) || 0), 0);
    }
  }

  // Active plans summary
  let activePlansList: Array<Record<string, unknown>> = [];
  if (hostId) {
    const { data } = await supabase
      .from("plans")
      .select("id, title, sala, location, price_clp, capacity, drop_number, status, days_of_week, schedule, short_description, image_url")
      .eq("host_id", hostId)
      .in("status", ["published", "draft", "paused"])
      .order("drop_number", { ascending: false });
    activePlansList = data || [];
  }

  const today = now.toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 md:p-10 max-w-[960px]">
      {/* Greeting */}
      <div className="mb-10">
        <h1 className="font-serif text-[28px] font-normal mb-2">
          Hola, {profile?.full_name || "Host"}
        </h1>
        <p className="text-[13px] text-brand-smoke capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="p-5 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2">Planes activos</div>
          <div className="text-[28px] font-normal text-brand-white">{activePlans ?? 0}</div>
        </div>
        <div className="p-5 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2">Reservas hoy</div>
          <div className="text-[28px] font-normal text-brand-lime">{todayReservations.length}</div>
        </div>
        <div className="p-5 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2">Personas hoy</div>
          <div className="text-[28px] font-normal text-brand-white">{todayPeople}</div>
        </div>
        <div className="p-5 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2">Total reservas</div>
          <div className="text-[28px] font-normal text-brand-white">{totalReservations ?? 0}</div>
          <div className="text-[11px] text-brand-smoke mt-1">{confirmedReservations ?? 0} confirmadas</div>
        </div>
      </div>

      {/* Today's reservations */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke">Reservas para hoy</h2>
          <a href="/host/dashboard/reservations" className="text-[11px] text-brand-smoke hover:text-brand-white transition-colors">
            Ver todas →
          </a>
        </div>

        {todayReservations.length === 0 ? (
          <div className="p-6 rounded-xl border border-brand bg-brand-surface text-center">
            <p className="text-[13px] text-brand-smoke">Sin reservas para hoy.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayReservations.map((r) => {
              const status = STATUS_LABEL[(r.status as string)] || STATUS_LABEL.pending;
              const profileData = r.profiles as Record<string, string> | null;
              return (
                <div key={r.id as string} className="flex items-center justify-between p-4 rounded-xl border border-brand bg-brand-surface">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] text-brand-white font-medium truncate">
                        {profileData?.full_name || profileData?.email || "Invitado"}
                      </span>
                      <span className={`text-[11px] ${status.className}`}>{status.label}</span>
                    </div>
                    <div className="text-[12px] text-brand-smoke">
                      {r.plan_title as string}
                      {r.time_slot ? ` · ${String(r.time_slot)}` : ""}
                      {` · ${r.num_people as number} ${(r.num_people as number) === 1 ? "persona" : "personas"}`}
                    </div>
                  </div>
                  <div className="text-[14px] text-brand-white shrink-0 ml-4">
                    ${(r.total_price as number)?.toLocaleString("es-CL")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Drops */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke">Mis drops / experiencias</h2>
          <a href="/host/dashboard/plans" className="text-[11px] text-brand-smoke hover:text-brand-white transition-colors">
            Ver detalle →
          </a>
        </div>

        {activePlansList.length === 0 ? (
          <div className="p-6 rounded-xl border border-brand bg-brand-surface text-center">
            <p className="text-[13px] text-brand-smoke mb-3">No tienes experiencias aún.</p>
            <a href="/host/apply" className="text-[12px] text-brand-lime hover:text-brand-white transition-colors">
              Postula tu primera experiencia
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {activePlansList.map((plan) => {
              const statusBadge: Record<string, { label: string; cls: string }> = {
                published: { label: "Publicado", cls: "text-brand-lime border-brand-lime/30" },
                draft: { label: "Borrador", cls: "text-brand-smoke border-brand-smoke/30" },
                paused: { label: "Pausado", cls: "text-brand-silver border-brand-silver/30" },
              };
              const badge = statusBadge[(plan.status as string)] || statusBadge.draft;
              const days = (plan.days_of_week as string[]) || [];
              const schedule = (plan.schedule as Array<{ start: string; end: string }>) || [];

              return (
                <div key={plan.id as string} className="p-4 rounded-xl border border-brand bg-brand-surface">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] text-brand-smoke/50">DROP {String(plan.drop_number).padStart(3, "0")}</span>
                        <span className={`px-2 py-0.5 border rounded-full text-[10px] uppercase tracking-[0.08em] ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <h3 className="font-serif text-[16px] font-normal text-brand-white mb-1 truncate">{plan.title as string}</h3>
                      <p className="text-[12px] text-brand-smoke mb-2">{plan.short_description as string}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-brand-smoke/70">
                        <span>{plan.sala as string}</span>
                        <span>{plan.location as string}</span>
                        <span>${(plan.price_clp as number)?.toLocaleString("es-CL")}</span>
                        {(plan.capacity as number) > 0 && <span>{plan.capacity as number} cupos</span>}
                      </div>
                      {days.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {days.map((d) => (
                            <span key={d} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[10px] text-brand-smoke">
                              {DAY_LABELS[d] || d}
                            </span>
                          ))}
                          {schedule.length > 0 && (
                            <span className="text-[10px] text-brand-smoke/50 self-center ml-1">
                              {schedule[0].start} – {schedule[0].end}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mb-10">
        <h2 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-4">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/host/apply" className="px-5 py-2.5 border border-brand rounded-full text-[12px] text-brand-smoke hover:text-brand-white hover:border-brand-smoke transition-all">
            Nueva postulación
          </a>
          <a href="/host/dashboard/reservations" className="px-5 py-2.5 border border-brand rounded-full text-[12px] text-brand-smoke hover:text-brand-white hover:border-brand-smoke transition-all">
            Ver reservas
          </a>
          <a href="/host/dashboard/messages" className="px-5 py-2.5 border border-brand rounded-full text-[12px] text-brand-smoke hover:text-brand-white hover:border-brand-smoke transition-all">
            Ver mensajes
          </a>
        </div>
      </div>
    </div>
  );
}
