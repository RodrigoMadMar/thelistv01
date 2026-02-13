"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { DropData, DropStatus, MediaItem } from "./DropCard";

/* ── CTA config per status ── */
const CTA: Record<DropStatus, { label: string; style: string }> = {
  default: {
    label: "Reservar",
    style: "bg-brand-white text-brand-black hover:-translate-y-px",
  },
  this_week: {
    label: "Reservar",
    style: "bg-brand-white text-brand-black hover:-translate-y-px",
  },
  last_seats: {
    label: "Tomar últimos cupos",
    style: "bg-brand-lime text-brand-black hover:-translate-y-px",
  },
  sold_out: {
    label: "Avisarme",
    style:
      "bg-transparent text-brand-smoke border border-brand-smoke hover:text-brand-white hover:border-brand-white",
  },
  members_first: {
    label: "Entrar",
    style: "bg-brand-white text-brand-black hover:-translate-y-px",
  },
  small_group: {
    label: "Reservar",
    style: "bg-brand-white text-brand-black hover:-translate-y-px",
  },
};

const STATUS_LABELS: Record<DropStatus, string | null> = {
  default: null,
  this_week: "THIS WEEK",
  last_seats: "LAST SEATS",
  sold_out: "SOLD OUT",
  members_first: "MEMBERS FIRST",
  small_group: "SMALL GROUP",
};

function statusBadgeColor(status: DropStatus): string {
  if (status === "sold_out") return "text-brand-smoke/50 line-through";
  if (status === "this_week" || status === "last_seats")
    return "text-brand-lime";
  return "text-brand-smoke";
}

function formatCLP(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

/* ── Media Carousel ── */
function MediaCarousel({
  items,
  alt,
}: {
  items: MediaItem[];
  alt: string;
}) {
  const [idx, setIdx] = useState(0);

  // Reset index when items change
  useEffect(() => setIdx(0), [items]);

  const prev = useCallback(
    () => setIdx((i) => (i - 1 + items.length) % items.length),
    [items.length],
  );
  const next = useCallback(
    () => setIdx((i) => (i + 1) % items.length),
    [items.length],
  );

  const current = items[idx];

  return (
    <div className="relative w-full h-[280px] group">
      {/* Media */}
      {current.type === "image" ? (
        <Image
          src={current.src}
          alt={`${alt} ${idx + 1}`}
          fill
          className="object-cover rounded-t-[14px]"
          sizes="520px"
        />
      ) : (
        <video
          key={current.src}
          src={current.src}
          poster={current.poster}
          className="absolute inset-0 w-full h-full object-cover rounded-t-[14px]"
          autoPlay
          muted
          loop
          playsInline
        />
      )}

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-black/60 rounded-t-[14px]" />

      {/* Arrows — only if more than 1 item */}
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-brand-black/50 backdrop-blur-[8px] text-brand-white/70 hover:text-brand-white opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-brand-black/50 backdrop-blur-[8px] text-brand-white/70 hover:text-brand-white opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-[6px] z-10">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className={`w-[6px] h-[6px] rounded-full border-none cursor-pointer transition-all duration-200 ${
                i === idx
                  ? "bg-brand-white scale-110"
                  : "bg-brand-white/40 hover:bg-brand-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Quantity Selector ── */
function QuantitySelector({
  max,
  value,
  onChange,
}: {
  max: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className="w-8 h-8 flex items-center justify-center rounded-full border border-brand-smoke/20 text-brand-smoke hover:border-brand-smoke/50 hover:text-brand-white disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-transparent cursor-pointer text-[14px] font-light"
      >
        -
      </button>
      <span className="text-[16px] font-normal text-brand-white min-w-[24px] text-center tabular-nums">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 flex items-center justify-center rounded-full border border-brand-smoke/20 text-brand-smoke hover:border-brand-smoke/50 hover:text-brand-white disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-transparent cursor-pointer text-[14px] font-light"
      >
        +
      </button>
    </div>
  );
}

/* ── Main Overlay ── */
interface DropOverlayProps {
  drop: DropData | null;
  onClose: () => void;
}

export default function DropOverlay({ drop, onClose }: DropOverlayProps) {
  const [qty, setQty] = useState(1);

  // Reset qty when a different drop opens
  useEffect(() => setQty(1), [drop?.id]);

  /* ── ESC key ── */
  useEffect(() => {
    if (!drop) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drop, onClose]);

  /* ── Lock body scroll ── */
  useEffect(() => {
    if (drop) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drop]);

  if (!drop) return null;

  const cta = CTA[drop.status];
  const isSoldOut = drop.status === "sold_out";

  /* Meta line */
  const metaParts: string[] = [];
  if (drop.dropNumber != null)
    metaParts.push(`DROP ${String(drop.dropNumber).padStart(3, "0")}`);
  if (drop.date) metaParts.push(drop.date);
  if (drop.time) metaParts.push(drop.time);
  if (drop.zone) metaParts.push(drop.zone);

  const statusLabel = STATUS_LABELS[drop.status];

  /* Media items — fallback to single image */
  const mediaItems: MediaItem[] =
    drop.media && drop.media.length > 0
      ? drop.media
      : [{ type: "image", src: drop.image }];

  /* Price calculation */
  const unitPrice = drop.unitPrice ?? 0;
  const totalPrice = unitPrice * qty;
  const maxSeats = drop.seats ?? 0;

  return (
    <div
      className="fixed inset-0 z-[8000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-brand-black/80 backdrop-blur-[8px]" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-brand-surface border border-brand rounded-[14px] animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-brand-black/60 backdrop-blur-[12px] text-brand-smoke hover:text-brand-white transition-colors border-none cursor-pointer"
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

        {/* Media Carousel */}
        <div className="relative">
          <MediaCarousel items={mediaItems} alt={drop.title} />

          {/* Badges */}
          <div className="absolute bottom-4 left-5 flex gap-[6px] z-10">
            <span className="px-[10px] py-1 bg-brand-black/65 backdrop-blur-[12px] rounded-full text-[9px] font-medium tracking-[0.1em] uppercase text-brand-lime">
              PLAN
            </span>
            {statusLabel && (
              <span
                className={`px-[10px] py-1 bg-brand-black/65 backdrop-blur-[12px] rounded-full text-[9px] font-medium tracking-[0.1em] uppercase ${statusBadgeColor(drop.status)}`}
              >
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="font-serif text-[26px] font-normal leading-[1.2] mb-2">
            {drop.title}
          </h2>

          {metaParts.length > 0 && (
            <div className="text-[11px] tracking-[0.04em] text-brand-smoke mb-4">
              {metaParts.join(" · ")}
            </div>
          )}

          {drop.description && (
            <p className="text-[14px] font-light text-brand-smoke leading-[1.6] mb-5">
              {drop.description}
            </p>
          )}

          {/* Detail row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-brand-smoke/70 mb-5 pt-4 border-t border-brand">
            {drop.sala && (
              <span>
                <span className="text-brand-smoke/40 mr-1.5">Sala</span>
                {drop.sala}
              </span>
            )}
            {maxSeats > 0 && (
              <span>
                <span className="text-brand-smoke/40 mr-1.5">Disponibles</span>
                <span className={maxSeats <= 3 ? "text-brand-lime" : ""}>
                  {maxSeats}
                </span>
              </span>
            )}
            {drop.seats === null && (
              <span className="text-brand-smoke/40">Sin cupos disponibles</span>
            )}
          </div>

          {/* Cupos selector + price — only if not sold out and has price */}
          {!isSoldOut && maxSeats > 0 && unitPrice > 0 && (
            <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-brand-black/40 border border-brand">
              <div>
                <div className="text-[11px] text-brand-smoke/50 uppercase tracking-[0.08em] mb-1">
                  Cupos a reservar
                </div>
                <QuantitySelector
                  max={maxSeats}
                  value={qty}
                  onChange={setQty}
                />
              </div>
              <div className="text-right">
                <div className="text-[11px] text-brand-smoke/50 uppercase tracking-[0.08em] mb-1">
                  Total
                </div>
                <div className="text-[22px] font-normal text-brand-white leading-none">
                  {formatCLP(totalPrice)}
                </div>
                {qty > 1 && (
                  <div className="text-[11px] text-brand-smoke/40 mt-1">
                    {formatCLP(unitPrice)} x {qty}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fallback: show price string if no unitPrice */}
          {!isSoldOut && !unitPrice && drop.price && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-brand-smoke/70 mb-6">
              <span>
                <span className="text-brand-smoke/40 mr-1.5">Precio</span>
                <span className="text-brand-white font-normal">
                  {drop.price}
                </span>
              </span>
            </div>
          )}

          {/* CTA */}
          <button
            className={`w-full font-sans text-[13px] font-medium tracking-[0.08em] uppercase px-8 py-[14px] rounded-full transition-all duration-300 cursor-pointer ${cta.style}`}
          >
            {isSoldOut
              ? cta.label
              : qty > 1
                ? `Reservar ${qty} cupos — ${formatCLP(totalPrice)}`
                : cta.label}
          </button>
        </div>
      </div>
    </div>
  );
}
