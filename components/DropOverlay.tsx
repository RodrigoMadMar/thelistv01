"use client";

import { useEffect } from "react";
import Image from "next/image";
import { DropData, DropStatus } from "./DropCard";

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

interface DropOverlayProps {
  drop: DropData | null;
  onClose: () => void;
}

export default function DropOverlay({ drop, onClose }: DropOverlayProps) {
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

  /* Meta line */
  const metaParts: string[] = [];
  if (drop.dropNumber != null)
    metaParts.push(`DROP ${String(drop.dropNumber).padStart(3, "0")}`);
  if (drop.date) metaParts.push(drop.date);
  if (drop.time) metaParts.push(drop.time);
  if (drop.zone) metaParts.push(drop.zone);

  const statusLabel = STATUS_LABELS[drop.status];

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

        {/* Image */}
        <div className="relative w-full h-[260px]">
          <Image
            src={drop.image}
            alt={drop.title}
            fill
            className="object-cover rounded-t-[14px]"
            sizes="520px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-black/60" />

          {/* Badges */}
          <div className="absolute bottom-4 left-5 flex gap-[6px]">
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
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-brand-smoke/70 mb-6 pt-4 border-t border-brand">
            {drop.sala && (
              <span>
                <span className="text-brand-smoke/40 mr-1.5">Sala</span>
                {drop.sala}
              </span>
            )}
            {drop.seats != null && drop.seats > 0 && (
              <span>
                <span className="text-brand-smoke/40 mr-1.5">Cupos</span>
                <span className={drop.seats <= 3 ? "text-brand-lime" : ""}>
                  {drop.seats}
                </span>
              </span>
            )}
            {drop.seats === null && (
              <span className="text-brand-smoke/40">Sin cupos disponibles</span>
            )}
            {drop.price && (
              <span>
                <span className="text-brand-smoke/40 mr-1.5">Precio</span>
                <span className="text-brand-white font-normal">
                  {drop.price}
                </span>
              </span>
            )}
          </div>

          {/* CTA */}
          <button
            className={`w-full font-sans text-[13px] font-medium tracking-[0.08em] uppercase px-8 py-[14px] rounded-full transition-all duration-300 cursor-pointer ${cta.style}`}
          >
            {cta.label}
          </button>
        </div>
      </div>
    </div>
  );
}
