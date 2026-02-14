"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updatePlanStatus } from "@/lib/actions";
import { applyServiceFee } from "@/lib/pricing";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "text-brand-smoke bg-brand-smoke/10" },
  published: { label: "Publicado", className: "text-brand-lime bg-brand-lime/10" },
  paused: { label: "Pausado", className: "text-brand-silver bg-brand-silver/10" },
  archived: { label: "Archivado", className: "text-brand-smoke/50 bg-brand-smoke/5" },
};

interface PlanRow {
  id: string;
  drop_number: number;
  title: string;
  sala: string;
  status: string;
  price_clp: number;
  capacity: number;
  published_at: string | null;
  hosts: { business_name: string } | null;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPlans() {
    const supabase = createClient();
    const { data } = await supabase
      .from("plans")
      .select("id, drop_number, title, sala, status, price_clp, capacity, published_at, hosts(business_name)")
      .order("drop_number", { ascending: false });
    setPlans((data || []) as unknown as PlanRow[]);
    setLoading(false);
  }

  useEffect(() => { loadPlans(); }, []);

  async function handleStatusChange(planId: string, newStatus: "published" | "paused" | "archived" | "draft") {
    await updatePlanStatus(planId, newStatus);
    loadPlans();
  }

  if (loading) return <div className="p-10 text-brand-smoke text-[13px]">Cargando...</div>;

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-[28px] font-normal mb-8">Planes</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 border-b border-brand">
              <th className="text-left py-3 px-2 font-normal">Drop</th>
              <th className="text-left py-3 px-2 font-normal">Título</th>
              <th className="text-left py-3 px-2 font-normal">Host</th>
              <th className="text-left py-3 px-2 font-normal">Sala</th>
              <th className="text-left py-3 px-2 font-normal">Estado</th>
              <th className="text-right py-3 px-2 font-normal">Precio</th>
              <th className="text-right py-3 px-2 font-normal">Cupos</th>
              <th className="text-right py-3 px-2 font-normal">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const badge = STATUS_BADGE[plan.status] || STATUS_BADGE.draft;
              return (
                <tr key={plan.id} className="border-b border-brand hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-2 text-brand-smoke/50">#{String(plan.drop_number).padStart(3, "0")}</td>
                  <td className="py-3 px-2 text-brand-white font-serif">{plan.title}</td>
                  <td className="py-3 px-2 text-brand-smoke">{(plan.hosts as Record<string, string> | null)?.business_name || "—"}</td>
                  <td className="py-3 px-2 text-brand-smoke text-[12px]">{plan.sala}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] ${badge.className}`}>{badge.label}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="text-brand-white">${applyServiceFee(plan.price_clp).toLocaleString("es-CL")}</div>
                    <div className="text-[10px] text-brand-smoke/50">Host: ${plan.price_clp?.toLocaleString("es-CL")}</div>
                  </td>
                  <td className="py-3 px-2 text-right text-brand-smoke">{plan.capacity}</td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex gap-2 justify-end">
                      {plan.status === "draft" && (
                        <button onClick={() => handleStatusChange(plan.id, "published")} className="text-[11px] text-brand-lime hover:underline bg-transparent border-none cursor-pointer">
                          Publicar
                        </button>
                      )}
                      {plan.status === "published" && (
                        <button onClick={() => handleStatusChange(plan.id, "paused")} className="text-[11px] text-brand-smoke hover:text-brand-white bg-transparent border-none cursor-pointer">
                          Pausar
                        </button>
                      )}
                      {plan.status === "paused" && (
                        <button onClick={() => handleStatusChange(plan.id, "published")} className="text-[11px] text-brand-lime hover:underline bg-transparent border-none cursor-pointer">
                          Publicar
                        </button>
                      )}
                      {plan.status !== "archived" && (
                        <button onClick={() => handleStatusChange(plan.id, "archived")} className="text-[11px] text-brand-smoke/50 hover:text-red-400 bg-transparent border-none cursor-pointer">
                          Archivar
                        </button>
                      )}
                    </div>
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
