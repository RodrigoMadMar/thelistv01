import { createClient } from "@/lib/supabase/server";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "text-brand-smoke bg-brand-smoke/10" },
  approved: { label: "Aprobada", className: "text-brand-lime bg-brand-lime/10" },
  rejected: { label: "Rechazada", className: "text-red-400 bg-red-400/10" },
};

interface UnifiedApp {
  id: string;
  experience_name: string;
  location: string;
  status: string;
  created_at: string;
  host_label: string;
  source: "internal" | "public";
}

export default async function AdminApplicationsPage() {
  const supabase = await createClient();

  // Fetch both internal and public applications
  const [{ data: internalApps }, { data: publicApps }] = await Promise.all([
    supabase
      .from("applications")
      .select("*, hosts(business_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("public_applications")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  // Merge into unified list sorted by date
  const unified: UnifiedApp[] = [
    ...(internalApps || []).map((app) => ({
      id: app.id,
      experience_name: app.experience_name,
      location: app.location,
      status: app.status,
      created_at: app.created_at,
      host_label: (app.hosts as Record<string, string> | null)?.business_name || "—",
      source: "internal" as const,
    })),
    ...(publicApps || []).map((app) => ({
      id: app.id,
      experience_name: app.experience_name,
      location: app.location,
      status: app.status,
      created_at: app.created_at,
      host_label: app.host_name || app.email,
      source: "public" as const,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
              <th className="text-left py-3 px-3 font-normal">Origen</th>
              <th className="text-left py-3 px-3 font-normal">Fecha</th>
              <th className="text-left py-3 px-3 font-normal">Estado</th>
              <th className="text-right py-3 px-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {unified.map((app) => {
              const badge = STATUS_BADGE[app.status] || STATUS_BADGE.pending;
              const date = new Date(app.created_at).toLocaleDateString("es-CL", {
                day: "numeric",
                month: "short",
              });
              const detailHref = app.source === "public"
                ? `/admin/applications/public/${app.id}`
                : `/admin/applications/${app.id}`;
              return (
                <tr key={`${app.source}-${app.id}`} className="border-b border-brand hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-brand-white font-serif">{app.experience_name}</td>
                  <td className="py-3 px-3 text-brand-smoke">{app.host_label}</td>
                  <td className="py-3 px-3 text-brand-smoke">{app.location}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.06em] ${
                      app.source === "public"
                        ? "text-blue-300 bg-blue-400/10"
                        : "text-brand-smoke/60 bg-brand-smoke/5"
                    }`}>
                      {app.source === "public" ? "Wizard" : "Interna"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-brand-smoke">{date}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <a href={detailHref} className="text-[12px] text-brand-smoke hover:text-brand-white transition-colors">
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
