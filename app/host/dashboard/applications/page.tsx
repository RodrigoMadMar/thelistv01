import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "En revisión", className: "text-brand-smoke border-brand-smoke/30" },
  approved: { label: "Aprobada", className: "text-brand-lime border-brand-lime/30" },
  rejected: { label: "Rechazada", className: "text-red-400/80 border-red-400/20" },
};

export default async function HostApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: host } = await supabase.from("hosts").select("id").eq("profile_id", user.id).single();
  const { data: applications } = host
    ? await supabase.from("applications").select("*").eq("host_id", host.id).order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="p-6 md:p-10 max-w-[960px]">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-serif text-[28px] font-normal">Postulaciones</h1>
        <a href="/host/apply" className="text-[12px] text-brand-smoke hover:text-brand-white transition-colors">
          + Nueva postulación
        </a>
      </div>

      {!applications || applications.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-brand-smoke text-[14px] mb-4">No tienes postulaciones.</p>
          <a href="/host/apply" className="text-[12px] text-brand-white hover:text-brand-lime transition-colors">
            Postula tu primera experiencia
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const badge = STATUS_BADGE[app.status] || STATUS_BADGE.pending;
            const date = new Date(app.created_at).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <div key={app.id} className="p-4 rounded-xl border border-brand bg-brand-surface hover:border-brand-hover transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif text-[16px] font-normal">{app.experience_name}</h3>
                  <span className={`px-2.5 py-0.5 border rounded-full text-[10px] uppercase tracking-[0.08em] ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="text-[12px] text-brand-smoke mb-2">
                  {app.location} · Enviada {date}
                </div>
                {app.admin_message && (
                  <div className="mt-3 p-3 rounded-lg bg-brand-black/40 border border-brand">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-1">Mensaje de THE LIST</div>
                    <p className="text-[13px] text-brand-smoke leading-[1.5]">{app.admin_message}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
