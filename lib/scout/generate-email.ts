import type { Lead } from "./types";

const CATEGORY_MAP: Record<string, string> = {
  restaurante: "RESTAURANTE",
  restaurant: "RESTAURANTE",
  restaurantes: "RESTAURANTE",
  bar: "BAR",
  bares: "BAR",
  "cafetería": "CAFETERÍA",
  cafeteria: "CAFETERÍA",
  cafeterias: "CAFETERÍA",
  cafe: "CAFETERÍA",
  "café": "CAFETERÍA",
  outdoor: "OUTDOOR",
  aventura: "AVENTURA",
  wellness: "WELLNESS",
  spa: "WELLNESS",
  taller: "TALLER",
  talleres: "TALLER",
  clase: "CLASE",
  hotel: "HOTEL",
};

const NAME_PREFIXES = [
  "Restaurante",
  "Restaurant",
  "Café",
  "Cafe",
  "Bar",
  "Hotel",
  "Spa",
  "Hostal",
];

function deriveShortName(name: string): string {
  for (const prefix of NAME_PREFIXES) {
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
      const rest = name.slice(prefix.length).trim();
      if (rest.length > 0) return rest;
    }
  }
  return name;
}

function deriveCategory(categories: string[]): string {
  for (const cat of categories) {
    const mapped = CATEGORY_MAP[cat.toLowerCase()];
    if (mapped) return mapped;
  }
  return "EXPERIENCIA";
}

export async function generateOutreachEmail(
  lead: Lead,
): Promise<{ subject: string; body: string; category_label: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const context = [
    `Nombre: ${lead.name}`,
    `Ciudad: ${lead.city}`,
    lead.commune ? `Comuna: ${lead.commune}` : null,
    lead.category?.length ? `Categoría: ${lead.category.join(", ")}` : null,
    lead.rating ? `Rating: ${lead.rating}/5 (${lead.review_count || 0} reviews)` : null,
    lead.address ? `Dirección: ${lead.address}` : null,
    lead.google_types?.length ? `Tipos Google: ${lead.google_types.join(", ")}` : null,
    lead.price_level !== null && lead.price_level !== undefined ? `Nivel de precio: ${lead.price_level}/4` : null,
    lead.description ? `Descripción: ${lead.description}` : null,
    lead.raw_data?.price_text ? `Precio: ${lead.raw_data.price_text}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Eres el scout de thelist.cl, una plataforma de experiencias curadas en Chile.

Dado el siguiente lugar:
${context}

Genera UNA frase que describa qué hace el lugar y qué lo hace especial.

REGLAS ESTRICTAS:
- Todo en minúscula
- Sin punto final
- Máximo 20 palabras
- Patrón: "{qué hacen} + {qué los diferencia}"
- Debe sonar como si hubieras ido al lugar o lo conocieras bien
- NO uses palabras como "único", "increíble", "maravilloso" ni adjetivos genéricos

EJEMPLOS:
- "pizza artesanal en espacios patrimoniales de Valpo, con música en vivo y cupos contados"
- "coctelería de autor en un speakeasy escondido en Lastarria, con carta rotativa semanal"
- "café de especialidad con tostaduría propia y los mejores filtrados de Barrio Italia"
- "cocina nikkei con pescadería propia y una relación precio-calidad difícil de encontrar"
- "trekking guiado por Cajón del Maipo con campamento y cena bajo las estrellas"

Responde SOLO con la frase, sin comillas, sin explicación, sin nada más.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const frasePersonalizada = data.content[0].text.trim().replace(/^["']|["']$/g, "").replace(/\.$/, "");

  const nombreCorto = deriveShortName(lead.name);
  const categoryLabel = deriveCategory(lead.category || []);

  const subject = `${lead.name}, los queremos en thelist`;

  const body = `Hola equipo ${nombreCorto},

Hemos visto lo que hacen — ${frasePersonalizada} — y nos encantaría que formen parte de THELIST.

Somos una plataforma de experiencias curadas en Chile. Cada evento se lanza como un drop exclusivo para grupos reducidos. Lo que necesitamos de ustedes: una experiencia exclusiva diseñada especialmente para estar en thelist. Algo que no se encuentre en otro lado.

El modelo es simple: ustedes se quedan con el 90% del precio, nosotros el 10%.

¿Conversamos? Respondan este mail o agendamos una llamada de 20 minutos cuando les acomode.

Rodrigo
contacto@thelist.cl`;

  return { subject, body, category_label: categoryLabel };
}
