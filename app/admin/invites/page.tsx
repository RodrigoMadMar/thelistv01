"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { regenerateOnboardingInvite } from "@/lib/onboarding-actions";

interface InviteRow {
  id: string;
  application_id: string;
  application_type: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

function getStatus(invite: InviteRow): { label: string; cls: string } {
  if (invite.used_at) {
    return { label: "Usado", cls: "text-brand-silver border-brand-silver/30" };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { label: "Expirado", cls: "text-red-400 border-red-400/30" };
  }
  return { label: "Activo", cls: "text-brand-lime border-brand-lime/30" };
}

function getDaysLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState("");
  const [regeneratingId, setRegeneratingId] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("onboarding_invites")
        .select("*")
        .order("created_at", { ascending: false });

      setInvites((data || []) as InviteRow[]);
      setLoading(false);
    }
    load();
  }, []);

  function buildLink(token: string) {
    return `${window.location.origin}/host/onboarding?token=${token}`;
  }

  async function handleCopy(invite: InviteRow) {
    await navigator.clipboard.writeText(buildLink(invite.token));
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(""), 2000);
  }

  async function handleRegenerate(invite: InviteRow) {
    setRegeneratingId(invite.id);
    setFeedback("");

    const result = await regenerateOnboardingInvite(invite.id);

    if (result.error) {
      setFeedback("Error: " + result.error);
      setRegeneratingId("");
      return;
    }

    // Update the list: mark old as used, add new
    setInvites((prev) => {
      const updated = prev.map((inv) =>
        inv.id === invite.id ? { ...inv, used_at: new Date().toISOString() } : inv
      );
      // Add new invite at the top
      const newInvite: InviteRow = {
        id: crypto.randomUUID(), // temp id until reload
        application_id: invite.application_id,
        application_type: invite.application_type,
        email: invite.email,
        token: result.token!,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
      };
      return [newInvite, ...updated];
    });

    setFeedback(`Nuevo link generado para ${invite.email}`);
    setRegeneratingId("");
    setTimeout(() => setFeedback(""), 3000);
  }

  if (loading) {
    return <div className="p-10 text-brand-smoke text-[13px]">Cargando...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-[1100px]">
      <div className="mb-8">
        <h1 className="font-serif text-[28px] font-normal mb-2">Invites de onboarding</h1>
        <p className="text-[13px] text-brand-smoke">
          Links enviados a hosts aprobados para completar su registro.
        </p>
      </div>

      {feedback && (
        <div className="mb-6 p-3 rounded-lg bg-brand-surface border border-brand text-[13px] text-brand-lime text-center">
          {feedback}
        </div>
      )}

      {invites.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-brand-smoke text-[14px]">No hay invites generados aún.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => {
            const status = getStatus(invite);
            const daysLeft = getDaysLeft(invite.expires_at);
            const isActive = !invite.used_at && new Date(invite.expires_at) >= new Date();
            const isExpiredOrUsed = !isActive;

            return (
              <div
                key={invite.id}
                className={`p-4 rounded-xl border bg-brand-surface ${
                  isActive ? "border-brand-lime/20" : "border-brand"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[14px] text-brand-white font-medium truncate">
                        {invite.email}
                      </span>
                      <span className={`px-2 py-0.5 border rounded-full text-[10px] uppercase tracking-[0.08em] shrink-0 ${status.cls}`}>
                        {status.label}
                      </span>
                      <span className="px-2 py-0.5 bg-white/[0.04] rounded-full text-[10px] text-brand-smoke shrink-0">
                        {invite.application_type === "public" ? "Wizard" : "Interna"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-brand-smoke/60">
                      <span>Creado: {new Date(invite.created_at).toLocaleDateString("es-CL")}</span>
                      <span>Expira: {new Date(invite.expires_at).toLocaleDateString("es-CL")}</span>
                      {isActive && (
                        <span className="text-brand-lime">
                          {daysLeft} {daysLeft === 1 ? "día restante" : "días restantes"}
                        </span>
                      )}
                      {invite.used_at && (
                        <span>Usado: {new Date(invite.used_at).toLocaleDateString("es-CL")}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isActive && (
                      <button
                        onClick={() => handleCopy(invite)}
                        className="px-4 py-2 bg-brand-lime text-brand-black text-[11px] uppercase tracking-[0.08em] font-medium rounded-full hover:-translate-y-px transition-all cursor-pointer border-none"
                      >
                        {copiedId === invite.id ? "Copiado" : "Copiar link"}
                      </button>
                    )}
                    {isExpiredOrUsed && !invite.used_at && (
                      <button
                        onClick={() => handleRegenerate(invite)}
                        disabled={regeneratingId === invite.id}
                        className="px-4 py-2 bg-brand-white text-brand-black text-[11px] uppercase tracking-[0.08em] font-medium rounded-full hover:-translate-y-px transition-all cursor-pointer border-none disabled:opacity-50"
                      >
                        {regeneratingId === invite.id ? "Generando..." : "Regenerar link"}
                      </button>
                    )}
                    {invite.used_at && (
                      <span className="text-[11px] text-brand-smoke/40 px-2">Onboarding completado</span>
                    )}
                    {isActive && (
                      <button
                        onClick={() => handleRegenerate(invite)}
                        disabled={regeneratingId === invite.id}
                        className="px-4 py-2 border border-brand text-brand-smoke text-[11px] uppercase tracking-[0.08em] rounded-full hover:text-brand-white hover:border-brand-smoke transition-all cursor-pointer bg-transparent disabled:opacity-50"
                      >
                        {regeneratingId === invite.id ? "..." : "Regenerar"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Link preview for active invites */}
                {isActive && (
                  <div className="mt-3 pt-3 border-t border-brand">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/40 mb-1">Link</div>
                    <p className="text-[11px] text-brand-smoke/60 font-mono break-all truncate">
                      {buildLink(invite.token)}
                    </p>
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
