"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { applyServiceFee, calcServiceFee, formatCLP } from "@/lib/pricing";
import { createReservation } from "@/lib/actions";
import type { Plan } from "@/lib/supabase/types";

interface TicketHolderForm {
  name: string;
  rut: string;
  email: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = params.planId as string;
  const initialQty = Number(searchParams.get("qty")) || 1;
  const initialSlot = searchParams.get("slot") || "";

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [qty, setQty] = useState(initialQty);
  const [selectedSlot, setSelectedSlot] = useState(initialSlot);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRut, setContactRut] = useState("");
  const [ticketHolders, setTicketHolders] = useState<TicketHolderForm[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Load plan data
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (error || !data) {
        setError("Experiencia no encontrada");
        setLoading(false);
        return;
      }
      setPlan(data as Plan);
      setLoading(false);
    }
    load();
  }, [planId]);

  // Update ticket holders when qty changes (for nominal experiences)
  useEffect(() => {
    if (plan?.is_nominal) {
      setTicketHolders((prev) => {
        const arr = [...prev];
        while (arr.length < qty) arr.push({ name: "", rut: "", email: "" });
        return arr.slice(0, qty);
      });
    }
  }, [qty, plan?.is_nominal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="text-brand-smoke text-[13px]">Cargando...</div>
      </div>
    );
  }

  if (!plan || error) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-smoke text-[14px] mb-4">
            {error || "Experiencia no encontrada"}
          </p>
          <a
            href="/"
            className="text-[12px] text-brand-white hover:text-brand-lime transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  const timeSlots = (plan.time_slots as { time: string; capacity: number }[]) || [];
  const hasTimeSlots = timeSlots.length > 0;
  const customerUnitPrice = applyServiceFee(plan.price_clp);
  const subtotal = plan.price_clp * qty;
  const serviceFee = calcServiceFee(plan.price_clp) * qty;
  const total = customerUnitPrice * qty;

  // Max capacity based on selected time slot or plan capacity
  const maxCapacity = hasTimeSlots && selectedSlot
    ? timeSlots.find((s) => s.time === selectedSlot)?.capacity ?? plan.capacity
    : plan.capacity;

  function updateTicketHolder(
    idx: number,
    field: keyof TicketHolderForm,
    value: string,
  ) {
    setTicketHolders((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [field]: value };
      return arr;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setError("");

    // Validations
    if (!contactName.trim()) return setError("Ingresa tu nombre");
    if (!contactEmail.trim()) return setError("Ingresa tu email");
    if (!contactPhone.trim()) return setError("Ingresa tu teléfono");
    if (!contactRut.trim()) return setError("Ingresa tu RUT");
    if (hasTimeSlots && !selectedSlot) return setError("Selecciona un horario");

    if (plan.is_nominal) {
      for (let i = 0; i < ticketHolders.length; i++) {
        const th = ticketHolders[i];
        if (!th.name.trim() || !th.rut.trim() || !th.email.trim()) {
          return setError(`Completa los datos del ticket ${i + 1}`);
        }
      }
    }

    setSubmitting(true);

    const result = await createReservation({
      planId: plan.id,
      numPeople: qty,
      date: selectedDate,
      timeSlot: selectedSlot || null,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      contactRut: contactRut.trim(),
      ticketHolders: plan.is_nominal ? ticketHolders : null,
      subtotal,
      serviceFee,
      totalPrice: total,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-black">
        <nav className="fixed top-0 left-0 right-0 z-[1000] h-16 flex items-center px-5 md:px-10 border-b border-brand bg-brand-black/80 backdrop-blur-[32px]">
          <a
            href="/"
            className="font-serif text-lg font-medium tracking-wide text-brand-white"
          >
            thelist<span className="text-brand-smoke font-normal">.</span>cl
          </a>
        </nav>
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="max-w-[480px] mx-auto px-5 text-center py-20">
            <div className="w-16 h-16 rounded-full bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center mx-auto mb-6">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B7FF3C"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="font-serif text-[28px] font-normal mb-3">
              Reserva confirmada
            </h1>
            <p className="text-[14px] text-brand-smoke mb-2">
              Tu reserva para <strong className="text-brand-white">{plan.title}</strong> ha
              sido registrada.
            </p>
            <p className="text-[13px] text-brand-smoke/60 mb-8">
              Recibirás un email de confirmación en{" "}
              <strong className="text-brand-smoke">{contactEmail}</strong>
            </p>
            <div className="p-4 rounded-xl border border-brand bg-brand-surface mb-8 text-left">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-brand-smoke/50 mb-0.5">Experiencia</div>
                  <div className="text-brand-white">{plan.title}</div>
                </div>
                <div>
                  <div className="text-brand-smoke/50 mb-0.5">Cupos</div>
                  <div className="text-brand-white">{qty}</div>
                </div>
                <div>
                  <div className="text-brand-smoke/50 mb-0.5">Fecha</div>
                  <div className="text-brand-white">{selectedDate}</div>
                </div>
                {selectedSlot && (
                  <div>
                    <div className="text-brand-smoke/50 mb-0.5">Horario</div>
                    <div className="text-brand-white">{selectedSlot} hrs</div>
                  </div>
                )}
                <div className="col-span-2">
                  <div className="text-brand-smoke/50 mb-0.5">Total pagado</div>
                  <div className="text-brand-white text-[16px]">
                    {formatCLP(total)}
                  </div>
                </div>
              </div>
            </div>
            <a
              href="/"
              className="inline-block px-8 py-3 rounded-full bg-brand-white text-brand-black text-[13px] font-medium uppercase tracking-[0.08em] hover:-translate-y-px transition-all"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] h-16 flex items-center justify-between px-5 md:px-10 border-b border-brand bg-brand-black/80 backdrop-blur-[32px]">
        <a
          href="/"
          className="font-serif text-lg font-medium tracking-wide text-brand-white"
        >
          thelist<span className="text-brand-smoke font-normal">.</span>cl
        </a>
        <button
          onClick={() => router.back()}
          className="text-[12px] text-brand-smoke hover:text-brand-white transition-colors bg-transparent border-none cursor-pointer"
        >
          Volver
        </button>
      </nav>

      <div className="pt-24 pb-20 px-5 md:px-10 max-w-[960px] mx-auto">
        <h1 className="font-serif text-[28px] font-normal mb-2">Checkout</h1>
        <p className="text-[13px] text-brand-smoke mb-10">
          Completa tus datos para reservar
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left column: Form ── */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
            {/* Time slot selector */}
            {hasTimeSlots && (
              <div>
                <label className="block text-[11px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-3">
                  Horario
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(slot.time);
                        if (qty > slot.capacity) setQty(slot.capacity);
                      }}
                      disabled={slot.capacity <= 0}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedSlot === slot.time
                          ? "border-brand-lime bg-brand-lime/5"
                          : slot.capacity <= 0
                            ? "border-brand/50 opacity-40 cursor-not-allowed"
                            : "border-brand hover:border-brand-smoke/40 cursor-pointer"
                      } bg-transparent`}
                    >
                      <div
                        className={`text-[15px] font-normal ${selectedSlot === slot.time ? "text-brand-lime" : "text-brand-white"}`}
                      >
                        {slot.time} hrs
                      </div>
                      <div className="text-[11px] text-brand-smoke/50 mt-0.5">
                        {slot.capacity > 0
                          ? `${slot.capacity} cupos`
                          : "Agotado"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 rounded-xl border border-brand bg-brand-surface text-brand-white text-[14px] focus:outline-none focus:border-brand-smoke/40 transition-colors"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-2">
                Cupos a reservar
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-brand-smoke/20 text-brand-smoke hover:border-brand-smoke/50 hover:text-brand-white disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-transparent cursor-pointer text-[16px]"
                >
                  -
                </button>
                <span className="text-[18px] font-normal text-brand-white min-w-[32px] text-center tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(Math.min(maxCapacity, qty + 1))}
                  disabled={qty >= maxCapacity}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-brand-smoke/20 text-brand-smoke hover:border-brand-smoke/50 hover:text-brand-white disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-transparent cursor-pointer text-[16px]"
                >
                  +
                </button>
                <span className="text-[12px] text-brand-smoke/50 ml-2">
                  máx. {maxCapacity}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-brand" />

            {/* Contact info */}
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-4">
                Datos de contacto
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-brand-smoke/40 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full px-4 py-3 rounded-xl border border-brand bg-brand-surface text-brand-white text-[14px] placeholder:text-brand-smoke/30 focus:outline-none focus:border-brand-smoke/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-brand-smoke/40 mb-1">
                    RUT
                  </label>
                  <input
                    type="text"
                    value={contactRut}
                    onChange={(e) => setContactRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full px-4 py-3 rounded-xl border border-brand bg-brand-surface text-brand-white text-[14px] placeholder:text-brand-smoke/30 focus:outline-none focus:border-brand-smoke/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-brand-smoke/40 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="juan@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-brand bg-brand-surface text-brand-white text-[14px] placeholder:text-brand-smoke/30 focus:outline-none focus:border-brand-smoke/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-brand-smoke/40 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className="w-full px-4 py-3 rounded-xl border border-brand bg-brand-surface text-brand-white text-[14px] placeholder:text-brand-smoke/30 focus:outline-none focus:border-brand-smoke/40 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Nominal ticket holders */}
            {plan.is_nominal && qty > 0 && (
              <div>
                <div className="h-px bg-brand mb-6" />
                <h3 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-1">
                  Datos por ticket
                </h3>
                <p className="text-[12px] text-brand-smoke/40 mb-4">
                  Esta experiencia es nominal. Ingresa los datos de cada
                  asistente.
                </p>
                <div className="space-y-4">
                  {ticketHolders.map((th, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-brand bg-brand-black/40"
                    >
                      <div className="text-[11px] text-brand-smoke/50 mb-3">
                        Ticket {i + 1}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={th.name}
                          onChange={(e) =>
                            updateTicketHolder(i, "name", e.target.value)
                          }
                          placeholder="Nombre completo"
                          className="w-full px-3 py-2.5 rounded-lg border border-brand bg-brand-surface text-brand-white text-[13px] placeholder:text-brand-smoke/30 focus:outline-none focus:border-brand-smoke/40 transition-colors"
                        />
                        <input
                          type="text"
                          value={th.rut}
                          onChange={(e) =>
                            updateTicketHolder(i, "rut", e.target.value)
                          }
                          placeholder="RUT"
                          className="w-full px-3 py-2.5 rounded-lg border border-brand bg-brand-surface text-brand-white text-[13px] placeholder:text-brand-smoke/30 focus:outline-none focus:border-brand-smoke/40 transition-colors"
                        />
                        <input
                          type="email"
                          value={th.email}
                          onChange={(e) =>
                            updateTicketHolder(i, "email", e.target.value)
                          }
                          placeholder="Email"
                          className="w-full px-3 py-2.5 rounded-lg border border-brand bg-brand-surface text-brand-white text-[13px] placeholder:text-brand-smoke/30 focus:outline-none focus:border-brand-smoke/40 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl border border-red-400/30 bg-red-400/5 text-red-400 text-[13px]">
                {error}
              </div>
            )}

            {/* Submit (mobile — sticky bottom) */}
            <div className="lg:hidden">
              <button
                type="submit"
                disabled={submitting}
                className="w-full font-sans text-[13px] font-medium tracking-[0.08em] uppercase px-8 py-[14px] rounded-full bg-brand-lime text-brand-black hover:-translate-y-px transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Procesando..." : `Pagar ${formatCLP(total)}`}
              </button>
              <p className="text-[10px] text-brand-smoke/40 text-center mt-2">
                Serás redirigido a la pasarela de pago
              </p>
            </div>
          </form>

          {/* ── Right column: Order summary ── */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-4">
              {/* Plan card */}
              <div className="rounded-xl border border-brand bg-brand-surface overflow-hidden">
                {plan.image_url && (
                  <div className="relative w-full h-[140px]">
                    <Image
                      src={plan.image_url}
                      alt={plan.title}
                      fill
                      className="object-cover"
                      sizes="400px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-black/60" />
                  </div>
                )}
                <div className="p-5">
                  <div className="text-[10px] text-brand-smoke/50 uppercase tracking-[0.08em] mb-1">
                    DROP {String(plan.drop_number).padStart(3, "0")} ·{" "}
                    {plan.sala}
                  </div>
                  <h2 className="font-serif text-[20px] font-normal mb-1">
                    {plan.title}
                  </h2>
                  <div className="text-[12px] text-brand-smoke/60">
                    {plan.location}
                  </div>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rounded-xl border border-brand bg-brand-surface p-5">
                <h3 className="text-[11px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-4">
                  Resumen
                </h3>

                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-brand-smoke">
                      {formatCLP(customerUnitPrice)} x {qty}{" "}
                      {qty === 1 ? "cupo" : "cupos"}
                    </span>
                    <span className="text-brand-white">{formatCLP(total)}</span>
                  </div>

                  <div className="flex justify-between text-[12px]">
                    <span className="text-brand-smoke/50">
                      Subtotal experiencia
                    </span>
                    <span className="text-brand-smoke/50">
                      {formatCLP(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[12px]">
                    <span className="text-brand-smoke/50">
                      Cargo por gestión (10%)
                    </span>
                    <span className="text-brand-smoke/50">
                      {formatCLP(serviceFee)}
                    </span>
                  </div>

                  <div className="h-px bg-brand my-2" />

                  <div className="flex justify-between">
                    <span className="text-brand-white font-medium">Total</span>
                    <span className="text-[18px] text-brand-white font-normal">
                      {formatCLP(total)}
                    </span>
                  </div>
                </div>

                {selectedSlot && (
                  <div className="mt-4 pt-3 border-t border-brand text-[12px] text-brand-smoke/60">
                    Horario seleccionado:{" "}
                    <span className="text-brand-white">{selectedSlot} hrs</span>
                  </div>
                )}
              </div>

              {/* CTA desktop */}
              <div className="hidden lg:block">
                <button
                  type="submit"
                  form=""
                  onClick={(e) => {
                    e.preventDefault();
                    const form = document.querySelector("form");
                    form?.requestSubmit();
                  }}
                  disabled={submitting}
                  className="w-full font-sans text-[13px] font-medium tracking-[0.08em] uppercase px-8 py-[14px] rounded-full bg-brand-lime text-brand-black hover:-translate-y-px transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Procesando..." : `Pagar ${formatCLP(total)}`}
                </button>
                <p className="text-[10px] text-brand-smoke/40 text-center mt-2">
                  Serás redirigido a la pasarela de pago
                </p>
              </div>

              {/* Payment methods placeholder */}
              <div className="rounded-xl border border-brand bg-brand-surface p-4">
                <div className="text-[10px] uppercase tracking-[0.1em] text-brand-smoke/50 mb-3">
                  Medios de pago
                </div>
                <div className="flex gap-3 items-center text-[11px] text-brand-smoke/40">
                  <span className="px-2.5 py-1 border border-brand rounded text-[10px]">
                    MercadoPago
                  </span>
                  <span className="px-2.5 py-1 border border-brand rounded text-[10px]">
                    Transbank
                  </span>
                  <span className="text-[10px]">Próximamente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
