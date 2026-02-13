import Image from "next/image";

export interface DropData {
  id: string;
  number: string;
  title: string;
  description: string;
  sala: string;
  image: string;
  date: string;
  location: string;
  seats: number | null; // null = sold out
  badges: { label: string; type: "lime" | "smoke" | "sold" }[];
}

export default function DropCard({ drop }: { drop: DropData }) {
  const isSoldOut = drop.seats === null;

  return (
    <a
      href={`#drop-${drop.id}`}
      className="block bg-brand-surface border border-brand rounded-[10px] overflow-hidden cursor-pointer hover:border-brand-hover hover:-translate-y-[3px] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition-all duration-400"
    >
      {/* Image */}
      <div className="relative w-full h-[220px]">
        <Image
          src={drop.image}
          alt={drop.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-black/10 to-brand-black/50 z-[1]" />

        {/* Drop number */}
        <span className="absolute top-[14px] left-[14px] text-[10px] font-normal tracking-[0.12em] uppercase text-brand-white z-[2] opacity-70">
          {drop.number}
        </span>

        {/* Badges */}
        <div className="absolute top-[14px] right-[14px] flex gap-[6px] z-[2]">
          {drop.badges.map((badge, i) => (
            <span
              key={i}
              className={`px-[10px] py-1 bg-brand-black/65 backdrop-blur-[12px] rounded-full text-[9px] font-medium tracking-[0.1em] uppercase ${
                badge.type === "lime"
                  ? "text-brand-lime"
                  : badge.type === "sold"
                    ? "text-brand-smoke/50 line-through"
                    : "text-brand-smoke"
              }`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-[18px] pb-5">
        <div className="text-[9px] tracking-[0.12em] uppercase text-brand-smoke mb-2">
          Sala: {drop.sala}
        </div>
        <h3 className="font-serif text-[19px] font-normal leading-[1.3] mb-[6px]">
          {drop.title}
        </h3>
        <p className="text-[13px] font-light text-brand-smoke leading-[1.5] mb-4">
          {drop.description}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-4 pt-[14px] border-t border-brand text-[11px] text-brand-smoke">
          <span className="flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-50"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
            </svg>
            {drop.date}
          </span>
          <span className="flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-50"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {drop.location}
          </span>
          <span
            className={`ml-auto font-normal ${isSoldOut ? "text-brand-smoke/40" : "text-brand-lime"}`}
          >
            {isSoldOut ? "Agotado" : `${drop.seats} cupos`}
          </span>
        </div>
      </div>
    </a>
  );
}
