import { createClient } from "@/lib/supabase/server";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "text-brand-smoke bg-brand-smoke/10" },
  approved: { label: "Aprobada", className: "text-brand-lime bg-brand-lime/10" },
  rejected: { label: "Rechazada", className: "text-red-400 bg-red-400/10" },
};

export default async function AdminApplicationsPage() {
  const supabase = await createClient();

  const { data: applications } = await supabase
    .from("applications")
    .select("*, hosts(business_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-[28px] font-normal mb-8">Postulaciones</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 border-b border-brand">
              <th className="text-left py-3 px-3 font-normal">Experiencia</th>
              <th className="text-left py-3 px-3 font-normal">Host</th>
              <th className="text-left py-3 px-3 font-normal">Ubicación</th>
              <th className="text-left py-3 px-3 font-normal">Fecha</th>
              <th className="text-left py-3 px-3 font-normal">Estado</th>
              <th className="text-right py-3 px-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {applications?.map((app) => {
              const badge = STATUS_BADGE[app.status] || STATUS_BADGE.pending;
              const hostData = app.hosts as Record<string, string> | null;
              const date = new Date(app.created_at).toLocaleDateString("es-CL", {
                day: "numeric",
                month: "short",
              });
              return (
                <tr key={app.id} className="border-b border-brand hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-brand-white font-serif">{app.experience_name}</td>
                  <td className="py-3 px-3 text-brand-smoke">{hostData?.business_name || "—"}</td>
                  <td className="py-3 px-3 text-brand-smoke">{app.location}</td>
                  <td className="py-3 px-3 text-brand-smoke">{date}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <a href={`/admin/applications/${app.id}`} className="text-[12px] text-brand-smoke hover:text-brand-white transition-colors">
                      Ver detalle
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
