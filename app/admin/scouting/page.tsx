"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Candidate, CandidateStatus } from "@/lib/supabase/types";
import {
  sendOutreachEmail,
  updateCandidateStatus,
  deleteCandidate,
} from "@/lib/scout-actions";

/* ── Status config ── */
const STATUS_CONFIG: Record<
  CandidateStatus,
  { label: string; color: string; bg: string }
> = {
  new: {
    label: "Nuevo",
    color: "text-brand-lime",
    bg: "bg-brand-lime/10 border-brand-lime/20",
  },
  contacted: {
    label: "Contactado",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
  },
  interested: {
    label: "Interesado",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
  rejected: {
    label: "Descartado",
    color: "text-brand-smoke/50",
    bg: "bg-brand-smoke/5 border-brand-smoke/10",
  },
  onboarded: {
    label: "Onboarded",
    color: "text-brand-lime",
    bg: "bg-brand-lime/15 border-brand-lime/30",
  },
};

const CATEGORY_OPTIONS = [
  "La Buena Mesa",
  "Bar & Vino",
  "Arte & Experimental",
  "Fiestas & Sesiones",
  "Outdoor",
];

/* ── Score bar ── */
function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(Math.max((score / 10) * 100, 0), 100);
  const color =
    score >= 8
      ? "bg-brand-lime"
      : score >= 6
        ? "bg-yellow-400"
        : "bg-brand-smoke/40";

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-[3px] rounded-full bg-brand-smoke/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-brand-smoke tabular-nums">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

/* ── Main page ── */
export default function ScoutingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CandidateStatus | "all">("all");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [previewEmail, setPreviewEmail] = useState<{
    name: string;
    html: string;
  } | null>(null);

  /* ── Fetch candidates ── */
  const fetchCandidates = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("score", { ascending: false });

    if (!error && data) setCandidates(data as Candidate[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  /* ── Toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Actions ── */
  const handleContact = async (id: string) => {
    setSendingId(id);
    const result = await sendOutreachEmail(id);
    setSendingId(null);

    if (result.error) {
      setToast({ message: result.error, type: "error" });
    } else {
      setToast({ message: "Email enviado correctamente", type: "success" });
      fetchCandidates();
    }
  };

  const handleStatusChange = async (id: string, status: CandidateStatus) => {
    const result = await updateCandidateStatus(id, status);
    if (result.error) {
      setToast({ message: result.error, type: "error" });
    } else {
      fetchCandidates();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteCandidate(id);
    if (result.error) {
      setToast({ message: result.error, type: "error" });
    } else {
      fetchCandidates();
    }
  };

  /* ── Filtered list ── */
  const filtered =
    filter === "all"
      ? candidates
      : candidates.filter((c) => c.status === filter);

  const counts = candidates.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="p-6 md:p-10 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-[28px] font-normal mb-1">Scouting</h1>
          <p className="text-[13px] text-brand-smoke">
            Candidatos encontrados por el agente de scouting.{" "}
            <span className="text-brand-smoke/40">
              {candidates.length} total
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-brand-smoke/40 mr-1">Filtrar:</span>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
              filter === "all"
                ? "border-brand-lime/30 text-brand-lime bg-brand-lime/5"
                : "border-brand text-brand-smoke hover:text-brand-white"
            }`}
          >
            Todos ({candidates.length})
          </button>
          {(
            ["new", "contacted", "interested", "rejected", "onboarded"] as CandidateStatus[]
          ).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  filter === s
                    ? `${cfg.bg} ${cfg.color}`
                    : "border-brand text-brand-smoke hover:text-brand-white"
                }`}
              >
                {cfg.label} ({counts[s] || 0})
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-brand-lime/30 border-t-brand-lime rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-[10px] tracking-[0.15em] uppercase text-brand-smoke/30 mb-3">
            {filter === "all" ? "Sin candidatos" : "Sin resultados"}
          </div>
          <p className="text-[13px] text-brand-smoke/40">
            {filter === "all"
              ? "Ejecuta el agente de scouting para encontrar candidatos."
              : "No hay candidatos con este estado."}
          </p>
          {filter === "all" && (
            <code className="block mt-4 text-[11px] text-brand-smoke/30 bg-brand-surface px-4 py-2 rounded-lg inline-block">
              npx tsx scripts/scout-agent.ts &quot;cata privada vinos
              Santiago&quot;
            </code>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((candidate) => {
            const cfg = STATUS_CONFIG[candidate.status];
            const isSending = sendingId === candidate.id;

            return (
              <div
                key={candidate.id}
                className="bg-brand-surface border border-brand rounded-[12px] p-5 hover:border-brand-hover transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-serif text-[18px] font-normal truncate">
                        {candidate.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[9px] font-medium tracking-wider uppercase ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                      <ScoreBar score={candidate.score} />
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-brand-smoke/50 mb-2">
                      {candidate.category && (
                        <span>
                          <span className="text-brand-smoke/30">Sala:</span>{" "}
                          {candidate.category}
                        </span>
                      )}
                      {candidate.location && (
                        <span>
                          <span className="text-brand-smoke/30">
                            Ubicación:
                          </span>{" "}
                          {candidate.location}
                        </span>
                      )}
                      {candidate.email && (
                        <span>
                          <span className="text-brand-smoke/30">Email:</span>{" "}
                          {candidate.email}
                        </span>
                      )}
                      {candidate.instagram && (
                        <a
                          href={`https://instagram.com/${candidate.instagram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-lime/70 hover:text-brand-lime transition-colors"
                        >
                          {candidate.instagram}
                        </a>
                      )}
                      {candidate.website && (
                        <a
                          href={
                            candidate.website.startsWith("http")
                              ? candidate.website
                              : `https://${candidate.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-smoke/50 hover:text-brand-white transition-colors underline"
                        >
                          Web
                        </a>
                      )}
                    </div>

                    {candidate.description && (
                      <p className="text-[12px] text-brand-smoke/60 leading-[1.5] line-clamp-2 mb-1">
                        {candidate.description}
                      </p>
                    )}

                    {candidate.reason && (
                      <p className="text-[11px] text-brand-smoke/40 italic">
                        &ldquo;{candidate.reason}&rdquo;
                      </p>
                    )}

                    {candidate.source_query && (
                      <div className="mt-2 text-[9px] text-brand-smoke/20">
                        Query: {candidate.source_query}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Contactar */}
                    {candidate.status === "new" && candidate.email && (
                      <button
                        onClick={() => handleContact(candidate.id)}
                        disabled={isSending}
                        className="px-4 py-2 bg-brand-lime text-brand-black text-[11px] font-medium tracking-[0.06em] uppercase rounded-full hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSending ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 border-2 border-brand-black/30 border-t-brand-black rounded-full animate-spin" />
                            Enviando…
                          </span>
                        ) : (
                          "Contactar"
                        )}
                      </button>
                    )}

                    {/* Ver email enviado */}
                    {candidate.outreach_email && (
                      <button
                        onClick={() =>
                          setPreviewEmail({
                            name: candidate.name,
                            html: candidate.outreach_email!,
                          })
                        }
                        className="px-3 py-2 border border-brand text-[11px] text-brand-smoke hover:text-brand-white hover:border-brand-hover rounded-full transition-colors cursor-pointer"
                      >
                        Ver email
                      </button>
                    )}

                    {/* Status dropdown */}
                    <select
                      value={candidate.status}
                      onChange={(e) =>
                        handleStatusChange(
                          candidate.id,
                          e.target.value as CandidateStatus,
                        )
                      }
                      className="px-3 py-2 bg-brand-black border border-brand rounded-full text-[11px] text-brand-smoke cursor-pointer focus:outline-none focus:border-brand-smoke/30"
                    >
                      <option value="new">Nuevo</option>
                      <option value="contacted">Contactado</option>
                      <option value="interested">Interesado</option>
                      <option value="rejected">Descartado</option>
                      <option value="onboarded">Onboarded</option>
                    </select>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(candidate.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-brand text-brand-smoke/40 hover:text-red-400 hover:border-red-400/30 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl text-[13px] font-medium shadow-[0_12px_40px_rgba(0,0,0,0.5)] animate-fade-up ${
            toast.type === "success"
              ? "bg-brand-lime text-brand-black"
              : "bg-red-500/90 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Email preview modal ── */}
      {previewEmail && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brand-black/80 backdrop-blur-[8px]"
            onClick={() => setPreviewEmail(null)}
          />
          <div className="relative w-full max-w-[600px] max-h-[80vh] overflow-y-auto bg-brand-surface border border-brand rounded-[14px] animate-fade-up">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-brand bg-brand-surface/90 backdrop-blur-[8px] z-10">
              <span className="text-[13px] text-brand-smoke">
                Email enviado a{" "}
                <span className="text-brand-white">{previewEmail.name}</span>
              </span>
              <button
                onClick={() => setPreviewEmail(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-brand-smoke hover:text-brand-white border-none cursor-pointer"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div
              className="p-6"
              dangerouslySetInnerHTML={{ __html: previewEmail.html }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
