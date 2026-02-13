import { createClient } from "@/lib/supabase/server";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "text-brand-smoke bg-brand-smoke/10" },
  active: { label: "Activo", className: "text-brand-lime bg-brand-lime/10" },
  suspended: { label: "Suspendido", className: "text-red-400 bg-red-400/10" },
};

export default async function AdminHostsPage() {
  const supabase = await createClient();
  const { data: hosts } = await supabase
    .from("hosts")
    .select("*, profiles:profile_id(full_name, email)")
    .order("created_at", { ascending: false });

  // Get plan counts per host
  const { data: planCounts } = await supabase
    .from("plans")
    .select("host_id")
    .eq("status", "published");

  const countMap: Record<string, number> = {};
  planCounts?.forEach((p) => {
    countMap[p.host_id] = (countMap[p.host_id] || 0) + 1;
  });

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-[28px] font-normal mb-8">Hosts</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 border-b border-brand">
              <th className="text-left py-3 px-3 font-normal">Nombre</th>
              <th className="text-left py-3 px-3 font-normal">Ubicación</th>
              <th className="text-left py-3 px-3 font-normal">Estado</th>
              <th className="text-right py-3 px-3 font-normal">Planes activos</th>
              <th className="text-left py-3 px-3 font-normal">Registro</th>
            </tr>
          </thead>
          <tbody>
            {hosts?.map((host) => {
              const badge = STATUS_BADGE[host.status] || STATUS_BADGE.pending;
              const profileData = host.profiles as Record<string, string> | null;
              const date = new Date(host.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
              return (
                <tr key={host.id} className="border-b border-brand hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3">
                    <div className="text-brand-white">{host.business_name}</div>
                    <div className="text-[11px] text-brand-smoke/50">{profileData?.full_name || profileData?.email}</div>
                  </td>
                  <td className="py-3 px-3 text-brand-smoke">{host.location || "—"}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] ${badge.className}`}>{badge.label}</span>
                  </td>
                  <td className="py-3 px-3 text-right text-brand-white">{countMap[host.id] || 0}</td>
                  <td className="py-3 px-3 text-brand-smoke">{date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
