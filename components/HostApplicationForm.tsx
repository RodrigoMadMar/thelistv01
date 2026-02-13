"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitApplication } from "@/lib/actions";

interface HostApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const SALAS = [
  "La Buena Mesa",
  "Bar & Vino",
  "Arte & Experimental",
  "Fiestas & Sesiones",
  "Outdoor",
];
const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const TOTAL_STEPS = 4;

export default function HostApplicationForm({ isOpen, onClose }: HostApplicationFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [contactName, setContactName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");

  // Step 2
  const [experienceName, setExperienceName] = useState("");
  const [description, setDescription] = useState("");
  const [sala, setSala] = useState("");

  // Step 3
  const [dailyCapacity, setDailyCapacity] = useState("");
  const [priceCLP, setPriceCLP] = useState("");
  const [schedule, setSchedule] = useState([{ start: "", end: "" }]);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);

  // Step 4
  const [mediaText, setMediaText] = useState("");

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

  const reset = useCallback(() => {
    setStep(0);
    setSubmitted(false);
    setError("");
    setContactName("");
    setBusinessName("");
    setLocation("");
    setPhone("");
    setInstagram("");
    setExperienceName("");
    setDescription("");
    setSala("");
    setDailyCapacity("");
    setPriceCLP("");
    setSchedule([{ start: "", end: "" }]);
    setDaysOfWeek([]);
    setMediaText("");
  }, []);

  const handleClose = () => {
    onClose();
    setTimeout(reset, 500);
  };

  function canAdvance(): boolean {
    if (step === 0) return !!(contactName && businessName && location && phone);
    if (step === 1) return !!(experienceName && description && sala);
    if (step === 2) {
      const cap = parseInt(dailyCapacity);
      const price = parseInt(priceCLP);
      const hasSchedule = schedule.some((s) => s.start && s.end);
      return cap > 0 && price > 0 && hasSchedule && daysOfWeek.length > 0;
    }
    return true;
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    const mediaUrls = mediaText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    const result = await submitApplication({
      businessName,
      contactName,
      location,
      phone,
      instagram,
      experienceName,
      description,
      sala,
      dailyCapacity: parseInt(dailyCapacity),
      priceCLP: parseInt(priceCLP),
      schedule: schedule.filter((s) => s.start && s.end),
      daysOfWeek,
      mediaUrls,
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSubmitted(true);
    }
  }

  function toggleDay(day: string) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function addScheduleSlot() {
    setSchedule((prev) => [...prev, { start: "", end: "" }]);
  }

  function removeScheduleSlot(idx: number) {
    setSchedule((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateScheduleSlot(idx: number, field: "start" | "end", value: string) {
    setSchedule((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  const progress = submitted ? 100 : ((step + 1) / TOTAL_STEPS) * 100;

  if (!isOpen) return null;

  const inputClass =
    "w-full bg-brand-surface border border-brand rounded-lg px-4 py-3 text-[14px] text-brand-white placeholder:text-brand-smoke/40 focus:outline-none focus:border-brand-smoke/30 transition-colors";
  const labelClass = "block text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2";

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
        {/* ── Confirmation ── */}
        {submitted && (
          <div className="flex flex-col items-center text-center animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-brand-lime/10 flex items-center justify-center mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B7FF3C" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="font-serif text-[32px] font-normal mb-3">Postulación enviada</h2>
            <p className="text-[14px] text-brand-smoke mb-10">
              La revisaremos y te avisaremos si queda aprobada para THE LIST.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleClose}
                className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-transparent text-brand-smoke border border-brand hover:border-brand-smoke hover:text-brand-white transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => router.push("/host/dashboard/applications")}
                className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-brand-white text-brand-black border-none hover:-translate-y-px transition-all cursor-pointer"
              >
                Ver estado en mi panel
              </button>
            </div>
          </div>
        )}

        {/* ── Steps ── */}
        {!submitted && (
          <div className="animate-fade-up">
            <div className="text-[10px] tracking-[0.2em] uppercase text-brand-smoke/40 mb-6 text-center">
              Paso {step + 1} de {TOTAL_STEPS}
            </div>

            {/* Step 1: Sobre ti */}
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[28px] font-normal text-center mb-8">Sobre ti</h2>
                <div>
                  <label className={labelClass}>Nombre del responsable comercial *</label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} placeholder="Tu nombre completo" />
                </div>
                <div>
                  <label className={labelClass}>Nombre del negocio / marca *</label>
                  <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} placeholder="Ej: La Cocina Secreta" />
                </div>
                <div>
                  <label className={labelClass}>Ubicación *</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Ej: Barrio Italia, Santiago" />
                </div>
                <div>
                  <label className={labelClass}>Teléfono *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+56 9 1234 5678" />
                </div>
                <div>
                  <label className={labelClass}>Instagram (opcional)</label>
                  <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} className={inputClass} placeholder="@tucuenta" />
                </div>
              </div>
            )}

            {/* Step 2: La experiencia */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[28px] font-normal text-center mb-8">La experiencia</h2>
                <div>
                  <label className={labelClass}>Nombre de la experiencia *</label>
                  <input type="text" value={experienceName} onChange={(e) => setExperienceName(e.target.value)} className={inputClass} placeholder="Ej: Private Tasting" />
                </div>
                <div>
                  <label className={labelClass}>Descripción detallada *</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass + " resize-none"} placeholder="Describe la experiencia en detalle..." />
                </div>
                <div className="p-4 rounded-lg border border-brand-smoke/10 bg-brand-smoke/[0.03]">
                  <p className="text-[12px] text-brand-smoke/60 leading-[1.6]">
                    La experiencia debe ser exclusivamente diseñada para THE LIST; no puede ser genérica ni estar ofrecida en otro canal. Si se detecta lo contrario, se bajará.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Sala / Categoría *</label>
                  <div className="flex flex-wrap gap-[8px]">
                    {SALAS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSala(s)}
                        className={`px-5 py-2.5 border rounded-full text-[12px] cursor-pointer transition-all ${
                          sala === s
                            ? "border-brand-white bg-brand-white text-brand-black font-medium"
                            : "border-brand text-brand-smoke hover:border-brand-white hover:text-brand-white bg-transparent"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Operación */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[28px] font-normal text-center mb-8">Operación</h2>
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

                <div>
                  <label className={labelClass}>Horarios *</label>
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
              </div>
            )}

            {/* Step 4: Contenido */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[28px] font-normal text-center mb-8">Contenido</h2>
                <div>
                  <label className={labelClass}>URLs de imágenes o videos (una por línea)</label>
                  <textarea value={mediaText} onChange={(e) => setMediaText(e.target.value)} rows={5} className={inputClass + " resize-none"} placeholder={"https://ejemplo.com/foto1.jpg\nhttps://ejemplo.com/foto2.jpg"} />
                </div>
                <div className="p-4 rounded-lg border border-brand-smoke/10 bg-brand-smoke/[0.03]">
                  <p className="text-[12px] text-brand-smoke/60 leading-[1.6]">
                    El contenido debe ser exclusivo para THE LIST y se usará para el anuncio en la plataforma.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p className="text-[13px] text-red-400 text-center mt-4">{error}</p>
            )}

            {/* Nav */}
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
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canAdvance()}
                  className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-brand-white text-brand-black border-none hover:-translate-y-px transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-brand-lime text-brand-black border-none hover:-translate-y-px transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
