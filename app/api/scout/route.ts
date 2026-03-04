import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

/* ── Auth check ── */
async function requireAdmin(req: NextRequest) {
  const { createClient: createServerClient } = await import(
    "@/lib/supabase/server"
  );
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("No autorizado");
}

/* ── Tool definitions (same as script) ── */
const tools: Anthropic.Tool[] = [
  {
    name: "web_search",
    description:
      "Search the web for potential experience hosts. Use specific queries about intimate experiences, private tastings, small group activities, underground events, etc. in Chile.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query in Spanish for finding experiences",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "save_candidate",
    description:
      "Save a potential host candidate to the database. Only save candidates with a score >= 6.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Business or host name" },
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
        instagram: { type: "string", description: "Instagram handle (e.g. @example)" },
        website: { type: "string", description: "Website URL if available" },
        email: { type: "string", description: "Contact email if found" },
        score: {
          type: "number",
          description:
            "Fit score 0-10. 10 = perfect for thelist (intimate, curated, small groups, unique). 5 = generic/mass market. Below 6 = don't save.",
        },
        reason: {
          type: "string",
          description: "Brief explanation of why this candidate scored this way",
        },
      },
      required: ["name", "category", "description", "score", "reason"],
    },
  },
];

/* ── Web search via Tavily ── */
async function executeWebSearch(query: string): Promise<string> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    return `⚠️ TAVILY_API_KEY not configured. Add it to your environment variables to enable web search.`;
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: "advanced",
        max_results: 8,
        include_answer: true,
      }),
    });
    const data = await res.json();
    const results = data.results
      ?.map(
        (r: { title: string; url: string; content: string }) =>
          `[${r.title}](${r.url})\n${r.content}`,
      )
      .join("\n\n");
    return `Search results for "${query}":\n\n${data.answer || ""}\n\n${results || "No results found."}`;
  } catch (err) {
    return `Search failed: ${(err as Error).message}. Try a different query.`;
  }
}

/* ── POST /api/scout ── */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const body = await req.json();
    const { query, location } = body as { query: string; location?: string };

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        { error: "La búsqueda debe tener al menos 3 caracteres" },
        { status: 400 },
      );
    }

    /* ── Init clients ── */
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada" },
        { status: 500 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Variables de Supabase no configuradas" },
        { status: 500 },
      );
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const supabase = createClient(supabaseUrl, supabaseKey);

    const seedQuery = query.trim();
    const queryWithLocation = location
      ? `${seedQuery} ${location.trim()}`
      : seedQuery;

    /* ── Agent loop ── */
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
- **7-9**: Buen fit pero le falta algún elemento
- **5-6**: Genérico o masivo, no guardar
- **<5**: No es un fit, ignorar

## Instrucciones:
1. Busca con múltiples queries relacionadas a: "${queryWithLocation}"
2. Varía las búsquedas (Instagram, Google, directorios locales)
3. Para cada hallazgo interesante, evalúa su fit con thelist
4. Guarda solo candidatos con score >= 6
5. Intenta encontrar al menos 3-5 candidatos de calidad
6. Incluye el email de contacto si lo encuentras

Comienza la búsqueda ahora.`,
      },
    ];

    let turns = 0;
    const maxTurns = 5;
    let savedCount = 0;
    const savedNames: string[] = [];

    while (turns < maxTurns) {
      turns++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 4096,
        tools,
        messages,
      });

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "end_turn") break;

      if (response.stop_reason === "tool_use") {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== "tool_use") continue;

          let result: string;

          if (block.name === "web_search") {
            result = await executeWebSearch(
              (block.input as { query: string }).query,
            );
          } else if (block.name === "save_candidate") {
            const input = block.input as Record<string, unknown>;
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
              source_query: seedQuery,
              status: "new",
            });

            if (error) {
              result = `Error saving: ${error.message}`;
            } else {
              savedCount++;
              savedNames.push(input.name as string);
              result = `Saved "${input.name}" (score: ${input.score}/10)`;
            }
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

    return NextResponse.json({
      success: true,
      savedCount,
      savedNames,
      turns,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "No autorizado") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Scout API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
