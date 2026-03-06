#!/usr/bin/env npx tsx
/**
 * Scout Agent — finds potential hosts for thelist.cl
 *
 * Usage:
 *   npx tsx scripts/scout-agent.ts "cata privada vinos Santiago"
 *   npx tsx scripts/scout-agent.ts "chef experiencia privada" --location "Barrio Italia"
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY           — Claude API key
 *   NEXT_PUBLIC_SUPABASE_URL    — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — Supabase service role key (to write candidates)
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

/* ── Config ── */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY is required");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const anthropic = new Anthropic();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── Tool definitions ── */
const tools: Anthropic.Tool[] = [
  {
    name: "save_candidate",
    description:
      "Save a potential host candidate to the database. Only save candidates with a score >= 6.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Business or host name",
        },
        category: {
          type: "string",
          enum: [
            "La Buena Mesa",
            "Bar & Vino",
            "Arte & Experimental",
            "Fiestas & Sesiones",
            "Outdoor",
          ],
          description: "Best-fitting sala category",
        },
        location: {
          type: "string",
          description: "City or neighborhood, e.g. 'Barrio Italia, Santiago'",
        },
        description: {
          type: "string",
          description:
            "Short description of what they offer and why they'd be a good fit",
        },
        instagram: {
          type: "string",
          description: "Instagram handle (e.g. @example)",
        },
        website: {
          type: "string",
          description: "Website URL if available",
        },
        email: {
          type: "string",
          description: "Contact email if found",
        },
        score: {
          type: "number",
          description:
            "Fit score 0-10. 10 = perfect for thelist (intimate, curated, small groups, unique). 5 = generic/mass market. Below 6 = don't save.",
        },
        reason: {
          type: "string",
          description:
            "Brief explanation of why this candidate scored this way",
        },
      },
      required: ["name", "category", "description", "score", "reason"],
    },
  },
];

/* ── Save candidate to Supabase ── */
async function saveCandidateToDb(
  input: Record<string, unknown>,
  sourceQuery: string,
): Promise<string> {
  const { error } = await supabase.from("candidates").insert({
    name: input.name,
    category: input.category || null,
    location: input.location || null,
    description: input.description || null,
    instagram: input.instagram || null,
    website: input.website || null,
    email: input.email || null,
    score: input.score || 0,
    reason: input.reason || null,
    source_query: sourceQuery,
    status: "new",
  });

  if (error) return `❌ Error saving: ${error.message}`;
  return `✅ Saved "${input.name}" (score: ${input.score}/10)`;
}

/* ── Main agent loop ── */
async function runScoutAgent(seedQuery: string, location?: string) {
  const queryWithLocation = location
    ? `${seedQuery} ${location}`
    : seedQuery;

  console.log(`\n🔍 Scout Agent — searching: "${queryWithLocation}"\n`);
  console.log("─".repeat(60));

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Eres un agente de scouting para thelist.cl, una plataforma chilena de experiencias curadas para grupos pequeños (máx 20 personas).

Tu misión: encontrar hosts potenciales que ofrezcan experiencias íntimas, únicas y de calidad.

## Salas (categorías):
- **La Buena Mesa**: chefs, catas, cenas privadas, gastronomía de autor
- **Bar & Vino**: listening bars, coctelería artesanal, sommelier, speakeasy
- **Arte & Experimental**: ceramistas, artistas, performance, talleres de autor
- **Fiestas & Sesiones**: DJs, stand-up, sesiones musicales, house parties curadas
- **Outdoor**: trekking, kayak, escalada, escapadas, astro-turismo

## Criterios de evaluación (score 0-10):
- **10**: Experiencia íntima, grupo pequeño, host con personalidad, no masivo, presencia online activa
- **7-9**: Buen fit pero le falta algún elemento (ej: capacidad grande pero se puede adaptar)
- **5-6**: Genérico o masivo, no guardar
- **<5**: No es un fit, ignorar

## Instrucciones:
1. Busca con múltiples queries relacionadas a: "${queryWithLocation}"
2. Varía las búsquedas (Instagram, Google, directorios locales)
3. Para cada hallazgo interesante, evalúa su fit con thelist
4. Guarda solo candidatos con score >= 6
5. Intenta encontrar al menos 3-5 candidatos de calidad
6. Incluye el email de contacto si lo encuentras (busca en su web/Instagram)

Comienza la búsqueda ahora.`,
    },
  ];

  let turns = 0;
  const maxTurns = 5;

  while (turns < maxTurns) {
    turns++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      tools,
      messages,
    });

    // Process response
    const assistantContent = response.content;
    messages.push({ role: "assistant", content: assistantContent });

    // Print text blocks
    for (const block of assistantContent) {
      if (block.type === "text") {
        console.log(`\n${block.text}`);
      }
    }

    // Check stop condition
    if (response.stop_reason === "end_turn") {
      console.log("\n" + "─".repeat(60));
      console.log("✅ Scouting complete.\n");
      break;
    }

    // Handle tool calls
    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of assistantContent) {
        if (block.type !== "tool_use") continue;

        console.log(`\n🔧 ${block.name}(${JSON.stringify(block.input).slice(0, 100)}...)`);

        let result: string;

        if (block.name === "save_candidate") {
          result = await saveCandidateToDb(
            block.input as Record<string, unknown>,
            seedQuery,
          );
          console.log(`   ${result}`);
        } else {
          result = "Unknown tool";
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }

      messages.push({ role: "user", content: toolResults });
    }
  }

  if (turns >= maxTurns) {
    console.log("\n⚠️ Max turns reached. Stopping.\n");
  }
}

/* ── CLI entry point ── */
const args = process.argv.slice(2);
const query = args.filter((a) => !a.startsWith("--")).join(" ");
const locationFlag = args.indexOf("--location");
const location =
  locationFlag !== -1 ? args[locationFlag + 1] : undefined;

if (!query) {
  console.log(`
Usage:
  npx tsx scripts/scout-agent.ts "<search query>" [--location "<city>"]

Examples:
  npx tsx scripts/scout-agent.ts "cata privada vinos naturales"
  npx tsx scripts/scout-agent.ts "chef experiencia privada" --location "Santiago"
  npx tsx scripts/scout-agent.ts "trekking nocturno" --location "Cajón del Maipo"
  npx tsx scripts/scout-agent.ts "listening bar coctelería"

Required env vars:
  ANTHROPIC_API_KEY
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
  process.exit(0);
}

runScoutAgent(query, location).catch((err) => {
  console.error("❌ Agent error:", err);
  process.exit(1);
});
