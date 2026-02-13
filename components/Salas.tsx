import Image from "next/image";

interface Sala {
  name: string;
  description: string;
  image: string;
}

const salas: Sala[] = [
  {
    name: "La Buena Mesa",
    description: "Cenas, catas, vino, experiencias gastronómicas",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&h=400&fit=crop",
  },
  {
    name: "Bar & Vino",
    description: "Barras, listening bars, coctelería, noche lenta",
    image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=500&h=400&fit=crop",
  },
  {
    name: "Arte & Experimental",
    description: "Cultura, performance, espacios autor",
    image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&h=400&fit=crop",
  },
  {
    name: "Fiestas & Sesiones",
    description: "Música, line-ups, noches",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=400&fit=crop",
  },
  {
    name: "Outdoor",
    description: "Escapadas, rutas, experiencias fuera de la ciudad",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=500&h=400&fit=crop",
  },
];

export default function Salas() {
  return (
    <section id="salas" className="px-5 md:px-10 pb-[120px] max-w-[1320px] mx-auto">
      {/* Divider */}
      <div className="h-px bg-brand mb-12" />

      {/* Header */}
      <div className="flex items-baseline justify-between mb-12">
        <h2 className="font-serif text-[28px] font-normal">Salas</h2>
        <span className="text-[10px] tracking-[0.15em] uppercase text-brand-smoke">
          Colecciones por energía
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {salas.map((sala) => (
          <div
            key={sala.name}
            className="relative h-[200px] md:h-[280px] rounded-[10px] overflow-hidden cursor-pointer border border-brand hover:border-brand-hover hover:-translate-y-[2px] transition-all duration-400 group"
          >
            {/* Background image */}
            <div className="absolute inset-0 group-hover:scale-[1.04] transition-transform duration-600">
              <Image
                src={sala.image}
                alt={sala.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 20vw"
              />
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-black/85 via-brand-black/30 to-brand-black/15 z-[1]" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 z-[2]">
              <div className="text-[9px] tracking-[0.15em] uppercase text-brand-smoke mb-[6px]">
                Sala
              </div>
              <div className="font-serif text-xl md:text-2xl font-normal">
                {sala.name}
              </div>
              <div className="text-[11px] text-brand-smoke mt-[6px] leading-[1.4]">
                {sala.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
