import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "text-brand-smoke" },
  confirmed: { label: "Confirmada", className: "text-brand-lime" },
  completed: { label: "Completada", className: "text-brand-silver" },
  cancelled: { label: "Cancelada", className: "text-red-400/70" },
};

export default async function HostReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: host } = await supabase.from("hosts").select("id").eq("profile_id", user.id).single();

  let reservations: Array<Record<string, unknown>> = [];
  if (host) {
    // Get plans for this host first
    const { data: plans } = await supabase.from("plans").select("id, title").eq("host_id", host.id);
    if (plans && plans.length > 0) {
      const planIds = plans.map((p) => p.id);
      const { data } = await supabase
        .from("reservations")
        .select("*, profiles:user_id(full_name, email)")
        .in("plan_id", planIds)
        .order("date", { ascending: false });

      reservations = (data || []).map((r) => ({
        ...r,
        plan_title: plans.find((p) => p.id === r.plan_id)?.title || "—",
      }));
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-[960px]">
      <h1 className="font-serif text-[28px] font-normal mb-8">Reservas</h1>

      {reservations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-brand-smoke text-[14px]">Sin reservas aún.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 border-b border-brand">
                <th className="text-left py-3 px-2 font-normal">Plan</th>
                <th className="text-left py-3 px-2 font-normal">Persona</th>
                <th className="text-left py-3 px-2 font-normal">Fecha</th>
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
