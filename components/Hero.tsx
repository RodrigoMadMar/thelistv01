"use client";

interface HeroProps {
  onOpenDoor: () => void;
}

export default function Hero({ onOpenDoor }: HeroProps) {
  const scrollToDrops = () => {
    document.getElementById("drops")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="h-screen flex flex-col justify-center items-center text-center px-5 md:px-10 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgba(183,255,60,0.015),transparent)]" />

      {/* Stamp */}
      <div className="flex items-center gap-[10px] text-[10px] font-normal tracking-[0.2em] uppercase text-brand-smoke mb-10 opacity-0 animate-fade-in animation-delay-200">
        <span className="w-6 h-px bg-brand-silver/30" />
        Invite only
        <span className="w-6 h-px bg-brand-silver/30" />
      </div>

      {/* Headline */}
      <h1 className="font-serif text-[clamp(52px,8vw,110px)] font-normal leading-[1.0] tracking-tight text-brand-white mb-7 opacity-0 animate-fade-up animation-delay-400">
        The list
        <br />
        is <em className="italic font-normal">short.</em>
      </h1>

      {/* Sub */}
      <p className="text-[15px] font-light text-brand-smoke max-w-[380px] leading-[1.7] mb-12 opacity-0 animate-fade-up animation-delay-600">
        Desbloquea experiencias curadas según tu energía. Sin catálogos, sin
        ruido. Solo lo que vale.
      </p>

      {/* Actions */}
      <div className="flex items-center gap-8 opacity-0 animate-fade-up animation-delay-800">
        <button
          onClick={onOpenDoor}
          className="inline-flex items-center gap-2 font-sans text-xs font-medium tracking-[0.08em] uppercase text-brand-black bg-brand-white border-none px-9 py-[14px] rounded-full hover:bg-white hover:-translate-y-[2px] hover:shadow-[0_12px_40px_rgba(242,242,238,0.08)] transition-all duration-300"
        >
          Desbloquear tu lista
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </button>

        <button
          onClick={scrollToDrops}
          className="flex items-center gap-[6px] text-xs font-light tracking-[0.06em] uppercase text-brand-smoke hover:text-brand-white transition-colors group bg-transparent border-none cursor-pointer"
        >
          Ver esta semana
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="group-hover:translate-x-[3px] transition-transform"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0 animate-fade-in animation-delay-1500">
        <span className="text-[9px] tracking-[0.15em] uppercase text-brand-smoke/40">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-brand-silver/20 to-transparent animate-scroll-pulse" />
      </div>
    </section>
  );
}
