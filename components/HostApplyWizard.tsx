"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { submitPublicApplication } from "@/lib/actions";

interface HostApplyWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const TOTAL_STEPS = 5;
const DRAFT_KEY = "thelist_host_apply_draft";

interface DraftData {
  step: number;
  experienceName: string;
  email: string;
  phone: string;
  hostName: string;
  location: string;
  description: string;
  commercialContact: string;
  dailyCapacity: string;
  priceCLP: string;
  daysOfWeek: string[];
  schedule: { start: string; end: string }[];
  mediaText: string;
}

export default function HostApplyWizard({ isOpen, onClose }: HostApplyWizardProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const draftLoaded = useRef(false);

  // Step 1 — Contacto
  const [experienceName, setExperienceName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hostName, setHostName] = useState("");

  // Step 2 — Detalles
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [commercialContact, setCommercialContact] = useState("");
  const [dailyCapacity, setDailyCapacity] = useState("");
  const [priceCLP, setPriceCLP] = useState("");

  // Step 3 — Disponibilidad
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [schedule, setSchedule] = useState([{ start: "", end: "" }]);

  // Step 4 — Multimedia
  const [mediaText, setMediaText] = useState("");

  // Step 5 — Confirmación exclusividad
  const [exclusivityConfirmed, setExclusivityConfirmed] = useState(false);

  // ── Draft persistence ──

  const buildDraft = useCallback((): DraftData => ({
    step,
    experienceName,
    email,
    phone,
    hostName,
    location,
    description,
    commercialContact,
    dailyCapacity,
    priceCLP,
    daysOfWeek,
    schedule,
    mediaText,
  }), [step, experienceName, email, phone, hostName, location, description, commercialContact, dailyCapacity, priceCLP, daysOfWeek, schedule, mediaText]);

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(buildDraft()));
    } catch { /* localStorage might be full or unavailable */ }
  }, [buildDraft]);

  // Load draft on first open
  useEffect(() => {
    if (!isOpen || draftLoaded.current) return;
    draftLoaded.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d: DraftData = JSON.parse(raw);
      if (d.experienceName) setExperienceName(d.experienceName);
      if (d.email) setEmail(d.email);
      if (d.phone) setPhone(d.phone);
      if (d.hostName) setHostName(d.hostName);
      if (d.location) setLocation(d.location);
      if (d.description) setDescription(d.description);
      if (d.commercialContact) setCommercialContact(d.commercialContact);
      if (d.dailyCapacity) setDailyCapacity(d.dailyCapacity);
      if (d.priceCLP) setPriceCLP(d.priceCLP);
      if (d.daysOfWeek?.length) setDaysOfWeek(d.daysOfWeek);
      if (d.schedule?.length) setSchedule(d.schedule);
      if (d.mediaText) setMediaText(d.mediaText);
      if (d.step > 0) setStep(d.step);
    } catch { /* corrupt draft, ignore */ }
  }, [isOpen]);

  // Save draft on beforeunload
  useEffect(() => {
    if (!isOpen || submitted) return;
    const handler = () => saveDraft();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isOpen, submitted, saveDraft]);

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
  }

  // ── Escape + body lock ──

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ── Reset ──

  const reset = useCallback(() => {
    setStep(0);
    setSubmitted(false);
    setError("");
    setExperienceName("");
    setEmail("");
    setPhone("");
    setHostName("");
    setLocation("");
    setDescription("");
    setCommercialContact("");
    setDailyCapacity("");
    setPriceCLP("");
    setDaysOfWeek([]);
    setSchedule([{ start: "", end: "" }]);
    setMediaText("");
    setExclusivityConfirmed(false);
    draftLoaded.current = false;
  }, []);

  const handleClose = () => {
    saveDraft();
    onClose();
  };

  // ── Validation per step ──

  function canAdvance(): boolean {
    if (step === 0) return !!(experienceName && email && phone);
    if (step === 1) {
      const cap = parseInt(dailyCapacity);
      const price = parseInt(priceCLP);
      return !!(location && description && commercialContact && cap > 0 && price > 0);
    }
    if (step === 2) {
      const hasSchedule = schedule.some((s) => s.start && s.end);
      return daysOfWeek.length > 0 && hasSchedule;
    }
    if (step === 3) return true; // multimedia is optional
    if (step === 4) return exclusivityConfirmed;
    return true;
  }

  function handleNext() {
    saveDraft();
    setStep((s) => s + 1);
  }

  // ── Schedule helpers ──

  function addScheduleSlot() {
    setSchedule((prev) => [...prev, { start: "", end: "" }]);
  }

  function removeScheduleSlot(idx: number) {
    setSchedule((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateScheduleSlot(idx: number, field: "start" | "end", value: string) {
    setSchedule((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function toggleDay(day: string) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  // ── Submit ──

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    const mediaUrls = mediaText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    const result = await submitPublicApplication({
      experienceName,
      email,
      phone,
      hostName,
      location,
      description,
      commercialContact,
      dailyCapacity: parseInt(dailyCapacity),
      priceCLP: parseInt(priceCLP),
      daysOfWeek,
      schedule: schedule.filter((s) => s.start && s.end),
      mediaUrls,
      exclusivityConfirmed,
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSubmitted(true);
      clearDraft();
    }
  }

  // ── Progress ──

  const progress = submitted ? 100 : ((step + 1) / TOTAL_STEPS) * 100;

  if (!isOpen) return null;

  const inputClass =
    "w-full bg-brand-surface border border-brand rounded-lg px-4 py-3 text-[14px] text-brand-white placeholder:text-brand-smoke/40 focus:outline-none focus:border-brand-smoke/30 transition-colors";
  const labelClass = "block text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2";

  // ── Format helpers for review ──

  function formatCLP(value: string) {
    const n = parseInt(value);
    return isNaN(n) ? value : "$" + n.toLocaleString("es-CL");
  }

  return (
    <div className="fixed inset-0 z-[9000] bg-brand-black flex flex-col items-center justify-center transition-opacity duration-500">
      {/* Close */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-5 md:right-10 bg-transparent border-none cursor-pointer text-brand-smoke hover:text-brand-white transition-colors z-10"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand">
        <div className="h-full bg-brand-white transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="w-full max-w-[560px] px-6 overflow-y-auto max-h-[85vh]">
        {/* ══════════════════════════════════════ */}
        {/* ── Confirmation (post-submit) ──────── */}
        {/* ══════════════════════════════════════ */}
        {submitted && (
          <div className="flex flex-col items-center text-center animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-brand-lime/10 flex items-center justify-center mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B7FF3C" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="font-serif text-[32px] font-normal mb-3">Postulación enviada</h2>
            <p className="text-[14px] text-brand-smoke mb-2 leading-[1.7]">
              La revisaremos y te contactaremos por mail o WhatsApp.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-smoke/20 bg-brand-smoke/[0.05] mb-10">
              <span className="w-[6px] h-[6px] rounded-full bg-yellow-400" />
              <span className="text-[12px] text-brand-smoke tracking-[0.05em] uppercase">En revisión</span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => { reset(); }}
                className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-transparent text-brand-smoke border border-brand hover:border-brand-smoke hover:text-brand-white transition-all cursor-pointer"
              >
                Enviar otra experiencia
              </button>
              <button
                onClick={() => { clearDraft(); reset(); onClose(); }}
                className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-brand-white text-brand-black border-none hover:-translate-y-px transition-all cursor-pointer"
              >
                Volver
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════ */}
        {/* ── Wizard Steps ───────────────────── */}
        {/* ══════════════════════════════════════ */}
        {!submitted && (
          <div className="animate-fade-up">
            <div className="text-[10px] tracking-[0.2em] uppercase text-brand-smoke/40 mb-6 text-center">
              Paso {step + 1} de {TOTAL_STEPS}
            </div>

            {/* ── Step 1: Contacto ── */}
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[28px] font-normal text-center mb-2">Contacto</h2>
                <p className="text-[13px] text-brand-smoke/50 text-center mb-6">
                  Lo mínimo para poder contactarte.
                </p>
                <div>
                  <label className={labelClass}>Nombre de la experiencia *</label>
                  <input type="text" value={experienceName} onChange={(e) => setExperienceName(e.target.value)} className={inputClass} placeholder="Ej: Private Tasting" />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="tu@email.com" />
                </div>
                <div>
                  <label className={labelClass}>Teléfono (WhatsApp) *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+56 9 1234 5678" />
                </div>
                <div>
                  <label className={labelClass}>Nombre del host / marca (opcional)</label>
                  <input type="text" value={hostName} onChange={(e) => setHostName(e.target.value)} className={inputClass} placeholder="Ej: La Cocina Secreta" />
                </div>
              </div>
            )}

            {/* ── Step 2: Detalles ── */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[28px] font-normal text-center mb-2">Detalles de la experiencia</h2>
                <p className="text-[13px] text-brand-smoke/50 text-center mb-6">
                  Cuéntanos qué hace especial tu propuesta.
                </p>
                <div>
                  <label className={labelClass}>Ubicación *</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Ej: Barrio Italia, Santiago" />
                </div>
                <div>
                  <label className={labelClass}>Detalle de la experiencia *</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass + " resize-none"} placeholder="Describe qué vivirá quien asista..." />
                </div>
                <div className="p-4 rounded-lg border border-brand-smoke/10 bg-brand-smoke/[0.03]">
                  <p className="text-[12px] text-brand-smoke/60 leading-[1.6]">
                    La experiencia debe ser exclusivamente diseñada para THE LIST; no puede ser genérica ni estar ofrecida en otro canal.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Responsable comercial *</label>
                  <input type="text" value={commercialContact} onChange={(e) => setCommercialContact(e.target.value)} className={inputClass} placeholder="Nombre del responsable" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Cupos diarios *</label>
                    <input type="number" min="1" value={dailyCapacity} onChange={(e) => setDailyCapacity(e.target.value)} className={inputClass} placeholder="Ej: 8" />
                  </div>
                  <div>
                    <label className={labelClass}>Precio por ticket (CLP) *</label>
                    <input type="number" min="1" value={priceCLP} onChange={(e) => setPriceCLP(e.target.value)} className={inputClass} placeholder="Ej: 45000" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Disponibilidad ── */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[28px] font-normal text-center mb-2">Disponibilidad</h2>
                <p className="text-[13px] text-brand-smoke/50 text-center mb-6">
                  ¿Cuándo opera tu experiencia?
                </p>
                <div>
                  <label className={labelClass}>Días que funciona *</label>
                  <div className="flex flex-wrap gap-[8px]">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-4 py-2 border rounded-full text-[12px] capitalize cursor-pointer transition-all ${
                          daysOfWeek.includes(day)
                            ? "border-brand-white bg-brand-white text-brand-black font-medium"
                            : "border-brand text-brand-smoke hover:border-brand-white hover:text-brand-white bg-transparent"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Horarios (bandas horarias) *</label>
                  <div className="space-y-2">
                    {schedule.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="time" value={slot.start} onChange={(e) => updateScheduleSlot(idx, "start", e.target.value)} className={inputClass + " flex-1"} />
                        <span className="text-brand-smoke text-[12px]">a</span>
                        <input type="time" value={slot.end} onChange={(e) => updateScheduleSlot(idx, "end", e.target.value)} className={inputClass + " flex-1"} />
                        {schedule.length > 1 && (
                          <button type="button" onClick={() => removeScheduleSlot(idx)} className="text-brand-smoke/40 hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addScheduleSlot} className="mt-2 text-[12px] text-brand-smoke hover:text-brand-white transition-colors cursor-pointer bg-transparent border-none">
                    + Agregar horario
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: Multimedia ── */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[28px] font-normal text-center mb-2">Multimedia</h2>
                <p className="text-[13px] text-brand-smoke/50 text-center mb-6">
                  Comparte fotos o videos de tu experiencia.
                </p>
                <div>
                  <label className={labelClass}>URLs de contenido (una por línea)</label>
                  <textarea value={mediaText} onChange={(e) => setMediaText(e.target.value)} rows={5} className={inputClass + " resize-none"} placeholder={"https://ejemplo.com/foto1.jpg\nhttps://ejemplo.com/video.mp4"} />
                </div>
                <div className="p-4 rounded-lg border border-brand-smoke/10 bg-brand-smoke/[0.03]">
                  <p className="text-[12px] text-brand-smoke/60 leading-[1.6]">
                    El contenido debe ser exclusivo para THE LIST y se usará para el anuncio en la plataforma.
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 5: Revisión y envío ── */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="font-serif text-[28px] font-normal text-center mb-2">Revisión y envío</h2>
                <p className="text-[13px] text-brand-smoke/50 text-center mb-6">
                  Confirma que todo está correcto antes de enviar.
                </p>

                {/* Summary */}
                <div className="space-y-4 p-5 rounded-xl border border-brand bg-brand-surface">
                  {/* Contact */}
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-2">Contacto</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
                      <span className="text-brand-smoke">Experiencia</span>
                      <span className="text-brand-white">{experienceName}</span>
                      <span className="text-brand-smoke">Email</span>
                      <span className="text-brand-white">{email}</span>
                      <span className="text-brand-smoke">Teléfono</span>
                      <span className="text-brand-white">{phone}</span>
                      {hostName && (
                        <>
                          <span className="text-brand-smoke">Host / Marca</span>
                          <span className="text-brand-white">{hostName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-brand" />

                  {/* Details */}
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-2">Detalles</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
                      <span className="text-brand-smoke">Ubicación</span>
                      <span className="text-brand-white">{location}</span>
                      <span className="text-brand-smoke">Responsable</span>
                      <span className="text-brand-white">{commercialContact}</span>
                      <span className="text-brand-smoke">Cupos</span>
                      <span className="text-brand-white">{dailyCapacity}</span>
                      <span className="text-brand-smoke">Precio</span>
                      <span className="text-brand-white">{formatCLP(priceCLP)}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-[13px] text-brand-smoke">Descripción</span>
                      <p className="text-[13px] text-brand-white/80 mt-1 leading-[1.6]">{description}</p>
                    </div>
                  </div>

                  <div className="h-px bg-brand" />

                  {/* Availability */}
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-2">Disponibilidad</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {daysOfWeek.map((d) => (
                        <span key={d} className="px-2.5 py-1 border border-brand rounded-full text-[11px] text-brand-smoke capitalize">{d}</span>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {schedule.filter((s) => s.start && s.end).map((s, i) => (
                        <p key={i} className="text-[13px] text-brand-white">{s.start} — {s.end}</p>
                      ))}
                    </div>
                  </div>

                  {/* Media */}
                  {mediaText.trim() && (
                    <>
                      <div className="h-px bg-brand" />
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-2">Multimedia</div>
                        <div className="space-y-1">
                          {mediaText.split("\n").filter(Boolean).map((url, i) => (
                            <p key={i} className="text-[12px] text-brand-smoke/70 break-all">{url.trim()}</p>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Exclusivity checkbox */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={exclusivityConfirmed}
                      onChange={(e) => setExclusivityConfirmed(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                      exclusivityConfirmed
                        ? "bg-brand-lime border-brand-lime"
                        : "border-brand-smoke/30 bg-transparent group-hover:border-brand-smoke/50"
                    }`}>
                      {exclusivityConfirmed && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#07080A" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-[13px] text-brand-smoke leading-[1.5]">
                    Confirmo que esta experiencia es exclusiva para THE LIST y no está publicada en otro canal.
                  </span>
                </label>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-[13px] text-red-400 text-center mt-4">{error}</p>
            )}

            {/* ── Navigation ── */}
            <div className="mt-10 flex gap-4 justify-center pb-6">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-transparent text-brand-smoke border border-brand hover:border-brand-smoke hover:text-brand-white transition-all cursor-pointer"
                >
                  Atrás
                </button>
              )}
              {step < TOTAL_STEPS - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canAdvance()}
                  className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-brand-white text-brand-black border-none hover:-translate-y-px transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  Continuar
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !exclusivityConfirmed}
                  className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-brand-lime text-brand-black border-none hover:-translate-y-px transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  {submitting ? "Enviando..." : "Enviar postulación"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
