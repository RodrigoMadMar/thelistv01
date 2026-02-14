"use client";

import { useState } from "react";
import { requestPlanChange } from "@/lib/actions";

interface RequestChangeButtonProps {
  planId: string;
  planTitle: string;
}

export default function RequestChangeButton({ planId, planTitle }: RequestChangeButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError("");

    const result = await requestPlanChange(planId, message.trim());

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-brand-lime/10 border border-brand-lime/20">
        <p className="text-[12px] text-brand-lime">Solicitud enviada. El equipo de THE LIST revisará tu pedido.</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-[11px] text-brand-smoke hover:text-brand-white transition-colors bg-transparent border-none cursor-pointer p-0 underline underline-offset-2"
        >
          Solicitar cambio
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-brand-smoke mb-1.5">
              ¿Qué cambio necesitas en &quot;{planTitle}&quot;?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              className="w-full bg-brand-black border border-brand rounded-lg px-3 py-2 text-[13px] text-brand-white placeholder:text-brand-smoke/40 focus:outline-none focus:border-brand-smoke/30 transition-colors resize-none"
              placeholder="Ej: Cambiar el horario a 20:00-22:00, actualizar la descripción..."
            />
          </div>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-brand-white text-brand-black text-[11px] uppercase tracking-[0.08em] font-medium rounded-full hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Enviando..." : "Enviar solicitud"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setMessage(""); setError(""); }}
              className="px-4 py-2 text-[11px] text-brand-smoke hover:text-brand-white transition-colors bg-transparent border-none cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
