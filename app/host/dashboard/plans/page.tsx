import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "text-brand-smoke border-brand-smoke/30" },
  published: { label: "Publicado", className: "text-brand-lime border-brand-lime/30" },
  paused: { label: "Pausado", className: "text-brand-silver border-brand-silver/30" },
  archived: { label: "Archivado", className: "text-brand-smoke/50 border-brand-smoke/20" },
};

export default async function HostPlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: host } = await supabase.from("hosts").select("id").eq("profile_id", user.id).single();
  const { data: plans } = host
    ? await supabase.from("plans").select("*").eq("host_id", host.id).order("drop_number", { ascending: false })
    : { data: [] };

  return (
    <div className="p-6 md:p-10 max-w-[960px]">
      <h1 className="font-serif text-[28px] font-normal mb-8">Mis planes</h1>

      {!plans || plans.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-brand-smoke text-[14px] mb-4">No tienes planes aún.</p>
          <a href="/host/apply" className="text-[12px] text-brand-white hover:text-brand-lime transition-colors">
            Postula tu primera experiencia
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const badge = STATUS_BADGE[plan.status] || STATUS_BADGE.draft;
            return (
              <div key={plan.id} className="flex items-center justify-between p-4 rounded-xl border border-brand bg-brand-surface hover:border-brand-hover transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-serif text-[16px] font-normal truncate">{plan.title}</h3>
                    <span className={`px-2.5 py-0.5 border rounded-full text-[10px] uppercase tracking-[0.08em] shrink-0 ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-[12px] text-brand-smoke">
                    {plan.sala} · {plan.location} · ${plan.price_clp?.toLocaleString("es-CL")}
                    {plan.capacity > 0 && ` · ${plan.capacity} cupos`}
                  </div>
                </div>
                <div className="text-[11px] text-brand-smoke/50 shrink-0 ml-4">
                  DROP {String(plan.drop_number).padStart(3, "0")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
