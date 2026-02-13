import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HostDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: host } = await supabase.from("hosts").select("*").eq("profile_id", user.id).single();

  const hostId = host?.id;

  // Stats
  const { count: activePlans } = hostId
    ? await supabase.from("plans").select("*", { count: "exact", head: true }).eq("host_id", hostId).eq("status", "published")
    : { count: 0 };

  const { count: pendingApps } = hostId
    ? await supabase.from("applications").select("*", { count: "exact", head: true }).eq("host_id", hostId).eq("status", "pending")
    : { count: 0 };

  const { count: pendingReservations } = hostId
    ? await supabase.from("reservations").select("*, plans!inner(*)", { count: "exact", head: true }).eq("plans.host_id", hostId).eq("status", "pending")
    : { count: 0 };

  const today = new Date().toLocaleDateString("es-CL", {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="p-5 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2">Planes activos</div>
          <div className="text-[28px] font-normal text-brand-white">{activePlans ?? 0}</div>
        </div>
        <div className="p-5 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2">Postulaciones en revisión</div>
          <div className="text-[28px] font-normal text-brand-white">{pendingApps ?? 0}</div>
        </div>
        <div className="p-5 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2">Reservas pendientes</div>
          <div className="text-[28px] font-normal text-brand-white">{pendingReservations ?? 0}</div>
        </div>
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
