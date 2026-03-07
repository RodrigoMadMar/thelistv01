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

  const nombreCorto = deriveShortName(lead.name);
  const categoryLabel = deriveCategory(lead.category || []);

  const subject = `${lead.name}, los queremos en thelist`;

  const body = `Hola ${nombreCorto},

Hemos visto lo que hacen y nos encantaría que formen parte de THELIST.

Somos una plataforma de experiencias curadas en Chile. Cada experiencia se lanza como un drop exclusivo, diseñado por ustedes: el formato, la capacidad y el precio lo definen ustedes.

El modelo es simple: ustedes se quedan con el 90% del precio, nosotros el 10%.

Si les interesa, les mandamos un link para hacer el onboarding y empezar a publicar.

Rodrigo
contacto@thelist.cl`;

  // Use Claude API to format the email cleanly
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Formatea el siguiente email de outreach de forma limpia y presentable. NO cambies el contenido ni agregues nada nuevo. Solo asegúrate de que el formato sea correcto: saltos de línea apropiados, sin caracteres extra, texto limpio.

Subject: ${subject}

Body:
${body}

Responde EXACTAMENTE con este formato JSON (sin markdown, sin backticks, solo el JSON):
{"subject": "...", "body": "..."}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const rawText = data.content[0].text.trim();

  try {
    const parsed = JSON.parse(rawText);
    return {
      subject: parsed.subject || subject,
      body: parsed.body || body,
      category_label: categoryLabel,
    };
  } catch {
    // If Claude doesn't return valid JSON, use the template directly
    return { subject, body, category_label: categoryLabel };
  }
}
