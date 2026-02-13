import Image from "next/image";

export type DropStatus =
  | "default"
  | "this_week"
  | "last_seats"
  | "sold_out"
  | "members_first"
  | "small_group";

export type MediaItem =
  | { type: "image"; src: string }
  | { type: "video"; src: string; poster?: string };

export interface DropData {
  id: string;
  dropNumber?: number;
  title: string;
  description?: string;
  image: string;
  media?: MediaItem[];
  date?: string;
  time?: string;
  zone?: string;
  status: DropStatus;
  sala?: string;
  seats?: number | null;
  price?: string;
  unitPrice?: number;
}

const STATUS_BADGE: Record<
  DropStatus,
  { label: string; className: string } | null
> = {
  default: null,
  this_week: { label: "THIS WEEK", className: "text-brand-lime" },
  last_seats: { label: "LAST SEATS", className: "text-brand-lime" },
  sold_out: {
    label: "SOLD OUT",
    className: "text-brand-smoke/50 line-through",
  },
  members_first: { label: "MEMBERS FIRST", className: "text-brand-smoke" },
  small_group: { label: "SMALL GROUP", className: "text-brand-smoke" },
};

function buildMetaLine(
  dropNumber?: number,
  date?: string,
  time?: string,
  zone?: string,
): string {
  const parts: string[] = [];
  if (dropNumber != null)
    parts.push(`DROP ${String(dropNumber).padStart(3, "0")}`);
  if (date) parts.push(date);
  if (time) parts.push(time);
  if (zone) parts.push(zone);
  return parts.join(" · ");
}

interface DropCardProps {
  drop: DropData;
  onClick: () => void;
}

export default function DropCard({ drop, onClick }: DropCardProps) {
  const statusBadge = STATUS_BADGE[drop.status];
  const metaLine = buildMetaLine(
    drop.dropNumber,
    drop.date,
    drop.time,
    drop.zone,
  );

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      className="bg-brand-surface border border-brand rounded-[10px] overflow-hidden cursor-pointer hover:border-brand-hover hover:-translate-y-[3px] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition-all duration-300 outline-none focus-visible:ring-1 focus-visible:ring-brand-smoke/30"
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

        {/* Badges — top-left, max 2 */}
        <div className="absolute top-[14px] left-[14px] flex gap-[6px] z-[2]">
          <span className="px-[10px] py-1 bg-brand-black/65 backdrop-blur-[12px] rounded-full text-[9px] font-medium tracking-[0.1em] uppercase text-brand-lime">
            PLAN
          </span>
          {statusBadge && (
            <span
              className={`px-[10px] py-1 bg-brand-black/65 backdrop-blur-[12px] rounded-full text-[9px] font-medium tracking-[0.1em] uppercase ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-[18px] pb-5">
        <h3 className="font-serif text-[19px] font-normal leading-[1.3] mb-[6px]">
          {drop.title}
        </h3>

        {metaLine && (
          <div className="text-[11px] tracking-[0.04em] text-brand-smoke mb-[6px]">
            {metaLine}
          </div>
        )}

        {drop.description && (
          <p className="text-[13px] font-light text-brand-smoke/70 leading-[1.5] line-clamp-1">
            {drop.description}
          </p>
        )}
      </div>
    </article>
  );
}
