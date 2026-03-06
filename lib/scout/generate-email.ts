import type { Lead } from "./types";

export async function generateOutreachEmail(
  lead: Lead,
): Promise<{ subject: string; body: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const context = [
    `Nombre: ${lead.name}`,
    `Ciudad: ${lead.city}`,
    lead.commune ? `Comuna: ${lead.commune}` : null,
    lead.category?.length ? `Categoría: ${lead.category.join(", ")}` : null,
    lead.rating ? `Rating: ${lead.rating}/5 (${lead.review_count || 0} reviews)` : null,
    lead.address ? `Dirección: ${lead.address}` : null,
    lead.website ? `Website: ${lead.website}` : null,
    lead.google_types?.length ? `Tipos Google: ${lead.google_types.join(", ")}` : null,
    lead.price_level !== null ? `Nivel de precio: ${lead.price_level}/4` : null,
    lead.description ? `Descripción: ${lead.description}` : null,
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
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Genera un email de outreach para invitar a "${lead.name}" a ser parte de thelist.cl.

Datos del lugar:
${context}

Sobre thelist.cl:
- Plataforma curada de experiencias en Chile
- Cada experiencia se lanza como un "drop" exclusivo
- Grupos pequeños, máx 20 personas
- Los hosts reciben el 90% del precio (10% fee thelist)
- Categorías: restaurante, bar, cafetería, outdoor, wellness, taller

Reglas para el email:
- Tono editorial, exclusivo, directo. NO spam. Tutear.
- Máximo 120 palabras en el body
- Mencionar algo específico del lugar (que no parezca genérico)
- El email es de "Rodrigo de thelist.cl", desde hola@thelist.cl
- Cerrar con una pregunta que invite a una conversación de 15 min
- Responder SOLO en JSON válido: {"subject": "...", "body": "..."}
- El body debe ser texto plano (sin HTML), con saltos de línea donde corresponda`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Extract JSON from response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse email JSON from Claude response");

  const parsed = JSON.parse(jsonMatch[0]);
  return { subject: parsed.subject, body: parsed.body };
}
