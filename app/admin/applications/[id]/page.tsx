"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { approveApplication, rejectApplication } from "@/lib/actions";

const SALAS = ["La Buena Mesa", "Bar & Vino", "Arte & Experimental", "Fiestas & Sesiones", "Outdoor"];

interface ApplicationData {
  id: string;
  experience_name: string;
  location: string;
  description: string;
  commercial_contact: string;
  daily_capacity: number;
  price_clp: number;
  schedule: Array<{ start: string; end: string }>;
  days_of_week: string[];
  media_urls: string[] | null;
  status: string;
  admin_comment: string | null;
  admin_message: string | null;
  created_at: string;
  hosts: { business_name: string; slug: string } | null;
}

export default function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [app, setApp] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [appId, setAppId] = useState("");

  // Approve state
  const [sala, setSala] = useState(SALAS[0]);
  const [approving, setApproving] = useState(false);

  // Reject state
  const [showReject, setShowReject] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectMessage, setRejectMessage] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Internal comment
  const [internalComment, setInternalComment] = useState("");

  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    async function load() {
      const { id } = await params;
      setAppId(id);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("applications")
        .select("*, hosts(business_name, slug)")
        .eq("id", id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }
      setApp(data as unknown as ApplicationData);
      setInternalComment(data.admin_comment || "");
      setLoading(false);
    }
    load();
  }, [params]);

  async function handleApprove() {
    setApproving(true);
    setFeedback("");
    const result = await approveApplication(appId, sala);
    setApproving(false);
    if (result.error) {
      setFeedback("Error: " + result.error);
    } else {
      setFeedback("Experiencia aprobada. Plan creado como borrador.");
      setTimeout(() => router.push("/admin/applications"), 2000);
    }
  }

  async function handleReject() {
    if (!rejectComment) return;
    setRejecting(true);
    setFeedback("");
    const result = await rejectApplication(appId, rejectComment, rejectMessage);
    setRejecting(false);
    if (result.error) {
      setFeedback("Error: " + result.error);
    } else {
      setFeedback("Postulación rechazada.");
      setTimeout(() => router.push("/admin/applications"), 2000);
    }
  }

  async function saveInternalComment() {
    const supabase = createClient();
    await supabase.from("applications").update({ admin_comment: internalComment }).eq("id", appId);
    setFeedback("Comentario guardado.");
    setTimeout(() => setFeedback(""), 2000);
  }

  if (loading) {
    return <div className="p-10 text-brand-smoke text-[13px]">Cargando...</div>;
  }

  if (!app) {
    return <div className="p-10 text-brand-smoke text-[13px]">Postulación no encontrada.</div>;
  }

  const date = new Date(app.created_at).toLocaleDateString("es-CL", {
    day: "numeric", month: "long", year: "numeric",
  });

  const inputClass = "w-full bg-brand-surface border border-brand rounded-lg px-4 py-3 text-[14px] text-brand-white placeholder:text-brand-smoke/40 focus:outline-none focus:border-brand-smoke/30 transition-colors";
  const labelClass = "block text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2";
  const isPending = app.status === "pending";

  return (
    <div className="p-6 md:p-10 max-w-[800px]">
      {/* Back */}
      <a href="/admin/applications" className="text-[12px] text-brand-smoke hover:text-brand-white transition-colors mb-6 inline-block">
        &larr; Volver a postulaciones
      </a>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-[28px] font-normal mb-2">{app.experience_name}</h1>
        <div className="text-[13px] text-brand-smoke">
          {(app.hosts as Record<string, string> | null)?.business_name} · {app.location} · {date}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-6 mb-10">
        <div>
          <div className={labelClass}>Descripción</div>
          <p className="text-[14px] text-brand-smoke leading-[1.7]">{app.description}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className={labelClass}>Contacto</div>
            <p className="text-[13px] text-brand-white">{app.commercial_contact}</p>
          </div>
          <div>
            <div className={labelClass}>Cupos</div>
            <p className="text-[13px] text-brand-white">{app.daily_capacity}</p>
          </div>
          <div>
            <div className={labelClass}>Precio CLP</div>
            <p className="text-[13px] text-brand-white">${app.price_clp.toLocaleString("es-CL")}</p>
          </div>
          <div>
            <div className={labelClass}>Estado</div>
            <p className="text-[13px] text-brand-white capitalize">{app.status}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className={labelClass}>Horarios</div>
            <div className="space-y-1">
              {app.schedule?.map((s, i) => (
                <p key={i} className="text-[13px] text-brand-smoke">{s.start} — {s.end}</p>
              ))}
            </div>
          </div>
          <div>
            <div className={labelClass}>Días</div>
            <div className="flex flex-wrap gap-1">
              {app.days_of_week?.map((d) => (
                <span key={d} className="px-2.5 py-1 border border-brand rounded-full text-[11px] text-brand-smoke capitalize">{d}</span>
              ))}
            </div>
          </div>
        </div>

        {app.media_urls && app.media_urls.length > 0 && (
          <div>
            <div className={labelClass}>Multimedia</div>
            <div className="space-y-1">
              {app.media_urls.map((url, i) => (
                <p key={i} className="text-[12px] text-brand-smoke/70 break-all">{url}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Internal comment */}
      <div className="mb-8 p-5 rounded-xl border border-brand bg-brand-surface">
        <div className={labelClass}>Comentario interno (solo admins)</div>
        <textarea value={internalComment} onChange={(e) => setInternalComment(e.target.value)} rows={2} className={inputClass + " resize-none mb-2"} placeholder="Notas internas..." />
        <button onClick={saveInternalComment} className="text-[11px] text-brand-smoke hover:text-brand-white transition-colors bg-transparent border-none cursor-pointer">
          Guardar comentario
        </button>
      </div>

      {/* Actions */}
      {isPending && (
        <div className="space-y-4 p-5 rounded-xl border border-brand bg-brand-surface">
          <h3 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-4">Acciones</h3>

          {/* Approve */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className={labelClass}>Sala para el plan</div>
              <select value={sala} onChange={(e) => setSala(e.target.value)} className={inputClass + " w-auto cursor-pointer"}>
                {SALAS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-6 py-3 rounded-full bg-brand-lime text-brand-black text-[12px] font-medium uppercase tracking-[0.08em] hover:-translate-y-px transition-all cursor-pointer disabled:opacity-50 border-none"
            >
              {approving ? "Aprobando..." : "Aprobar experiencia"}
            </button>
          </div>

          <div className="h-px bg-brand my-4" />

          {/* Reject */}
          {!showReject ? (
            <button
              onClick={() => setShowReject(true)}
              className="px-6 py-3 rounded-full border border-red-400/30 text-red-400 text-[12px] uppercase tracking-[0.08em] hover:bg-red-400/10 transition-all cursor-pointer bg-transparent"
            >
              Rechazar
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <div className={labelClass}>Motivo del rechazo (requerido)</div>
                <textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Razón del rechazo..." />
              </div>
              <div>
                <div className={labelClass}>Mensaje al host (opcional)</div>
                <textarea value={rejectMessage} onChange={(e) => setRejectMessage(e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Mensaje visible para el host..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowReject(false)} className="px-5 py-2.5 rounded-full border border-brand text-brand-smoke text-[12px] hover:text-brand-white transition-colors cursor-pointer bg-transparent">
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectComment || rejecting}
                  className="px-5 py-2.5 rounded-full bg-red-400/20 text-red-400 text-[12px] uppercase tracking-[0.08em] hover:bg-red-400/30 transition-all cursor-pointer disabled:opacity-50 border-none"
                >
                  {rejecting ? "Rechazando..." : "Confirmar rechazo"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <div className="mt-4 p-3 rounded-lg bg-brand-surface border border-brand text-[13px] text-brand-lime text-center">
          {feedback}
        </div>
      )}
    </div>
  );
}
