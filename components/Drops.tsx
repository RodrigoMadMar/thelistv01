import DropCard, { DropData } from "./DropCard";

const drops: DropData[] = [
  {
    id: "014",
    number: "Drop 014",
    title: "Private tasting",
    description: "Luz baja, 8 copas, un host obsesivo.",
    sala: "La Buena Mesa",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
    date: "Vie 21:00",
    location: "Barrio Italia",
    seats: 3,
    badges: [
      { label: "Last seats", type: "lime" },
      { label: "Small group", type: "smoke" },
    ],
  },
  {
    id: "013",
    number: "Drop 013",
    title: "Trekking nocturno",
    description: "Sin linternas. Luna llena y sendero ciego.",
    sala: "Outdoor",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop",
    date: "Sáb 20:30",
    location: "Cajón del Maipo",
    seats: 8,
    badges: [{ label: "Members first", type: "smoke" }],
  },
  {
    id: "012",
    number: "Drop 012",
    title: "Cerámica en silencio",
    description: "2 horas. Sin música. Solo tus manos y el barro.",
    sala: "Arte & Experimental",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
    date: "Dom 11:00",
    location: "Providencia",
    seats: 4,
    badges: [{ label: "This week", type: "lime" }],
  },
  {
    id: "011",
    number: "Drop 011",
    title: "Kayak en los fiordos",
    description: "Tres días. Sin señal. Máximo 6 personas.",
    sala: "Outdoor",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
    date: "Mar 7 — 9",
    location: "Aysén",
    seats: null,
    badges: [{ label: "Sold out", type: "sold" }],
  },
  {
    id: "010",
    number: "Drop 010",
    title: "Stand-up a puerta cerrada",
    description: "Un comediante. 20 sillas. Sin grabaciones.",
    sala: "Fiestas & Sesiones",
    image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=400&fit=crop",
    date: "Jue 22:00",
    location: "Bellavista",
    seats: 2,
    badges: [{ label: "Last seats", type: "lime" }],
  },
  {
    id: "009",
    number: "Drop 009",
    title: "Cena ciega",
    description: "No sabes qué comes. No sabes quién cocina. Confía.",
    sala: "Bar & Vino",
    image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop",
    date: "Sáb 21:00",
    location: "Lastarria",
    seats: 6,
    badges: [{ label: "Small group", type: "smoke" }],
  },
];

export default function Drops() {
  return (
    <section id="drops" className="py-[100px] px-5 md:px-10 max-w-[1320px] mx-auto">
      {/* Divider */}
      <div className="h-px bg-brand mb-12" />

      {/* Header */}
      <div className="flex items-baseline justify-between mb-12">
        <h2 className="font-serif text-[28px] font-normal">Drops</h2>
        <span className="text-[10px] tracking-[0.15em] uppercase text-brand-smoke">
          Esta semana · {drops.filter((d) => d.seats !== null).length} activos
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drops.map((drop) => (
          <DropCard key={drop.id} drop={drop} />
        ))}
      </div>
    </section>
  );
}
