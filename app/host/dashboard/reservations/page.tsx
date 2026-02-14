import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReservationDateFilter from "@/components/ReservationDateFilter";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "text-brand-smoke" },
  confirmed: { label: "Confirmada", className: "text-brand-lime" },
  completed: { label: "Completada", className: "text-brand-silver" },
  cancelled: { label: "Cancelada", className: "text-red-400/70" },
};

export default async function HostReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const filterDate = params.date || "";

  const { data: host } = await supabase.from("hosts").select("id").eq("profile_id", user.id).single();

  let reservations: Array<Record<string, unknown>> = [];
  let totalCount = 0;
  let confirmedCount = 0;
  let totalPeople = 0;
  let totalRevenue = 0;

  if (host) {
    const { data: plans } = await supabase.from("plans").select("id, title").eq("host_id", host.id);
    if (plans && plans.length > 0) {
      const planIds = plans.map((p) => p.id);

      let query = supabase
        .from("reservations")
        .select("*, profiles:user_id(full_name, email)")
        .in("plan_id", planIds)
        .order("date", { ascending: false });

      if (filterDate) {
        query = query.eq("date", filterDate);
      }

      const { data } = await query;

      reservations = (data || []).map((r) => ({
        ...r,
        plan_title: plans.find((p) => p.id === r.plan_id)?.title || "—",
      }));

      totalCount = reservations.length;
      confirmedCount = reservations.filter((r) => r.status === "confirmed").length;
      totalPeople = reservations.reduce((sum, r) => sum + ((r.num_people as number) || 0), 0);
      totalRevenue = reservations
        .filter((r) => r.status !== "cancelled")
        .reduce((sum, r) => sum + ((r.total_price as number) || 0), 0);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-[960px]">
      <h1 className="font-serif text-[28px] font-normal mb-6">Reservas</h1>

      {/* Date filter */}
      <ReservationDateFilter currentDate={filterDate} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-1">Reservas</div>
          <div className="text-[22px] text-brand-white">{totalCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-1">Confirmadas</div>
          <div className="text-[22px] text-brand-lime">{confirmedCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-1">Personas</div>
          <div className="text-[22px] text-brand-white">{totalPeople}</div>
        </div>
        <div className="p-4 rounded-xl border border-brand bg-brand-surface">
          <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-1">Ingresos</div>
          <div className="text-[22px] text-brand-white">${totalRevenue.toLocaleString("es-CL")}</div>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-brand-smoke text-[14px]">
            {filterDate ? `Sin reservas para ${filterDate}.` : "Sin reservas aún."}
          </p>
          {filterDate && (
            <a href="/host/dashboard/reservations" className="text-[12px] text-brand-smoke hover:text-brand-white transition-colors mt-2 inline-block">
              Ver todas las reservas
            </a>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 border-b border-brand">
                <th className="text-left py-3 px-2 font-normal">Plan</th>
                <th className="text-left py-3 px-2 font-normal">Persona</th>
                <th className="text-left py-3 px-2 font-normal">Fecha</th>
                <th className="text-left py-3 px-2 font-normal">Horario</th>
                <th className="text-right py-3 px-2 font-normal">Personas</th>
                <th className="text-right py-3 px-2 font-normal">Total</th>
                <th className="text-right py-3 px-2 font-normal">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const status = STATUS_LABEL[(r.status as string)] || STATUS_LABEL.pending;
                const profileData = r.profiles as Record<string, string> | null;
                return (
                  <tr key={r.id as string} className="border-b border-brand hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-2 text-brand-white">{r.plan_title as string}</td>
                    <td className="py-3 px-2 text-brand-smoke">{profileData?.full_name || profileData?.email || "—"}</td>
                    <td className="py-3 px-2 text-brand-smoke">{r.date as string}</td>
                    <td className="py-3 px-2 text-brand-smoke">{(r.time_slot as string) || "—"}</td>
                    <td className="py-3 px-2 text-right text-brand-smoke">{r.num_people as number}</td>
                    <td className="py-3 px-2 text-right text-brand-white">${(r.total_price as number)?.toLocaleString("es-CL")}</td>
                    <td className={`py-3 px-2 text-right text-[12px] ${status.className}`}>{status.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
