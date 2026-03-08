import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { CITIES } from "@/lib/scout/config";

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

/* ── Google Maps Places search ── */
const GMAPS_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.googleMapsUri",
].join(",");

async function searchGoogleMaps(
  query: string,
  location?: string,
): Promise<string> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return "Error: GOOGLE_MAPS_API_KEY no configurada";

  const textQuery = location ? `${query} en ${location}, Chile` : `${query} Chile`;

  // Try to find city coords for location bias
  let locationBias: Record<string, unknown> | undefined;
  if (location) {
    const cityKey = Object.keys(CITIES).find(
      (c) => location.toLowerCase().includes(c.toLowerCase()),
    );
    if (cityKey) {
      const coords = CITIES[cityKey];
      locationBias = {
        circle: {
          center: { latitude: coords.lat, longitude: coords.lng },
          radius: 15000,
        },
      };
    }
  }

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": GMAPS_FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "es",
          regionCode: "CL",
          maxResultCount: 10,
          ...(locationBias ? { locationBias } : {}),
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return `Error de Google Maps API (${res.status}): ${errText}`;
    }

    const data = await res.json();
    const places = data.places || [];

    if (places.length === 0) return "Sin resultados en Google Maps para esta búsqueda.";

    return places
      .map(
        (p: Record<string, unknown>) => {
          const display = p.displayName as Record<string, string> | undefined;
          return [
            `- **${display?.text || "Sin nombre"}**`,
            p.formattedAddress ? `  Dirección: ${p.formattedAddress}` : null,
            p.rating ? `  Rating: ${p.rating}/5 (${p.userRatingCount || 0} reseñas)` : null,
            p.websiteUri ? `  Web: ${p.websiteUri}` : null,
            p.nationalPhoneNumber ? `  Tel: ${p.nationalPhoneNumber}` : null,
            p.googleMapsUri ? `  Maps: ${p.googleMapsUri}` : null,
          ]
            .filter(Boolean)
            .join("\n");
        },
      )
      .join("\n\n");
  } catch (err) {
    return `Error buscando en Google Maps: ${(err as Error).message}`;
  }
}

/* ── Comino.cl search ── */
const COMINO_USER_AGENT = "Mozilla/5.0 (compatible; thelistbot/1.0)";

async function searchComino(query: string): Promise<string> {
  try {
    // Fetch the main guide page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://comino.cl/guia/", {
      headers: { "User-Agent": COMINO_USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return "Error: no se pudo acceder a comino.cl";

    const html = await res.text();

    // Extract listing slugs
    const slugRegex = /href="https:\/\/comino\.cl\/guia\/([a-z0-9-]+)\/?"/gi;
    const slugs = new Set<string>();
    let match;
    while ((match = slugRegex.exec(html)) !== null) {
      if (match[1]) slugs.add(match[1]);
    }

    // Filter slugs by query keywords
    const keywords = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\s+/)
      .filter((k) => k.length > 2);

    const matchingSlugs = Array.from(slugs).filter((slug) => {
      const normalized = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return keywords.some((kw) => normalized.includes(kw));
    });

    // Also fetch detail pages for top matches (max 5)
    const results: string[] = [];
    const slugsToFetch = matchingSlugs.length > 0 ? matchingSlugs.slice(0, 5) : [];

    for (const slug of slugsToFetch) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const pageRes = await fetch(`https://comino.cl/guia/${slug}/`, {
          headers: { "User-Agent": COMINO_USER_AGENT },
          signal: ctrl.signal,
        });
        clearTimeout(t);

        if (!pageRes.ok) continue;
        const pageHtml = await pageRes.text();

        // Extract basic info
        const nameMatch = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, "").trim() : slug;

        const igMatch = pageHtml.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
        const ig = igMatch ? `@${igMatch[1].replace(/\/$/, "")}` : null;

        const telMatch = pageHtml.match(/tel:([+\d\s-]+)/i);
        const phone = telMatch ? telMatch[1].trim() : null;

        // Description: longest paragraph
        const paragraphs = pageHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
        let desc = "";
        for (const p of paragraphs) {
          const text = p.replace(/<[^>]+>/g, "").trim();
          if (text.length > desc.length && text.length > 50) desc = text;
        }

        results.push(
          [
            `- **${name}**`,
            `  URL: https://comino.cl/guia/${slug}/`,
            ig ? `  Instagram: ${ig}` : null,
            phone ? `  Tel: ${phone}` : null,
            desc ? `  Descripción: ${desc.slice(0, 200)}...` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        await new Promise((r) => setTimeout(r, 300));
      } catch {
        continue;
      }
    }

    if (results.length === 0) {
      // If no slug match, return all available slugs for the agent to review
      const allSlugs = Array.from(slugs).slice(0, 30);
      return `No se encontraron coincidencias directas para "${query}" en comino.cl. Listings disponibles: ${allSlugs.join(", ")}`;
    }

    return `Resultados de comino.cl para "${query}":\n\n${results.join("\n\n")}`;
  } catch (err) {
    return `Error buscando en comino.cl: ${(err as Error).message}`;
  }
}

/* ── Scrape website/Instagram for emails ── */
const SCRAPE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function scrapeForEmails(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: { "User-Agent": SCRAPE_USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return `Error: no se pudo acceder a ${url} (${res.status})`;

    const html = await res.text();

    // Extract emails with regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const rawEmails = html.match(emailRegex) || [];

    // Filter out common false positives
    const excluded = new Set([
      "example@email.com",
      "name@example.com",
      "email@example.com",
      "user@example.com",
      "test@test.com",
      "wixpress.com",
      "sentry.io",
    ]);

    const emails = Array.from(new Set(rawEmails)).filter((e) => {
      const lower = e.toLowerCase();
      if (excluded.has(lower)) return false;
      // Skip image/asset filenames that look like emails
      if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".svg")) return false;
      // Skip common code/framework emails
      if (lower.includes("webpack") || lower.includes("babel") || lower.includes("eslint")) return false;
      return true;
    });

    // Also look for mailto: links
    const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    let match;
    while ((match = mailtoRegex.exec(html)) !== null) {
      const email = match[1].toLowerCase();
      if (!emails.includes(email) && !excluded.has(email)) {
        emails.push(email);
      }
    }

    // Also extract Instagram handles if found
    const igRegex = /instagram\.com\/([a-zA-Z0-9._]{2,30})/gi;
    const igHandles = new Set<string>();
    while ((match = igRegex.exec(html)) !== null) {
      const handle = match[1].replace(/\/$/, "").toLowerCase();
      const igExcluded = new Set(["p", "reel", "stories", "explore", "accounts", "about", "legal", "developer"]);
      if (!igExcluded.has(handle)) igHandles.add(handle);
    }

    const parts: string[] = [];
    if (emails.length > 0) {
      parts.push(`Emails encontrados: ${emails.join(", ")}`);
    }
    if (igHandles.size > 0) {
      parts.push(`Instagram: ${Array.from(igHandles).map((h) => `@${h}`).join(", ")}`);
    }

    if (parts.length === 0) {
      return `No se encontraron emails ni Instagram en ${url}`;
    }

    return parts.join("\n");
  } catch (err) {
    return `Error accediendo a ${url}: ${(err as Error).message}`;
  }
}

/* ── Tool definitions ── */
const tools: Anthropic.Tool[] = [
  {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 15,
  } as unknown as Anthropic.Tool,
  {
    name: "search_google_maps",
    description:
      "Search for businesses on Google Maps using the Places API. Returns name, address, rating, website, phone and Maps link for each result. Use this to find real businesses by type and location.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query, e.g. 'pizzeria artesanal', 'bar de cócteles', 'taller de cerámica'",
        },
        location: {
          type: "string",
          description:
            "City or area to search in, e.g. 'Santiago', 'Providencia', 'Valparaíso'. Optional.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_comino",
    description:
      "Search for businesses listed on comino.cl, a Chilean restaurant and bar guide. Returns name, URL, Instagram, phone and description for matching listings.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query to match against comino.cl listings, e.g. 'pizza', 'bar', 'cafe'",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "scrape_emails",
    description:
      "Scrape a website URL to extract email addresses and Instagram handles. Use this on candidate websites and Instagram profile pages to find contact emails.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description:
            "URL to scrape. Can be a business website, Instagram profile page (https://www.instagram.com/handle/), or any page that might contain an email.",
        },
      },
      required: ["url"],
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
        sources: {
          type: "array",
          items: { type: "string", enum: ["google_maps", "comino", "web_search"] },
          description:
            "Which sources this candidate was found in. E.g. ['google_maps', 'web_search']",
        },
      },
      required: ["name", "category", "description", "score", "reason", "sources"],
    },
  },
];

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
        content: `Scout para thelist.cl (experiencias curadas, grupos pequeños, Chile). Busca hosts potenciales.

Salas: La Buena Mesa (gastronomía), Bar & Vino (coctelería), Arte & Experimental (talleres), Fiestas & Sesiones (música/DJ), Outdoor (aventura).

Score 0-10: >=8 íntimo/único/personalidad, 6-7 buen fit, <6 no guardar.

Pasos:
1. search_google_maps: "${queryWithLocation}"
2. search_comino con términos relevantes
3. Para los mejores resultados, scrape_emails en su web e Instagram
4. save_candidate solo score>=6, incluir sources y email si lo encontraste
5. Busca 3-5 candidatos de calidad

Sé eficiente: no busques más de lo necesario. Comienza.`,
      },
    ];

    let turns = 0;
    const maxTurns = 8;
    let savedCount = 0;
    const savedNames: string[] = [];

    // Truncate long tool results to keep context small
    const truncate = (text: string, max = 1500): string => {
      if (text.length <= max) return text;
      return text.slice(0, max) + "\n...(truncado)";
    };

    const debugLog: string[] = [];

    while (turns < maxTurns) {
      turns++;

      // Rate limit: wait 2s between turns to stay under tokens/min
      if (turns > 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }

      let response: Anthropic.Message;
      let retries = 0;
      const maxRetries = 4;
      while (true) {
        try {
          response = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2048,
            tools,
            messages,
          });
          break;
        } catch (apiErr: unknown) {
          const status = (apiErr as { status?: number }).status;
          const errMsg = (apiErr as Error).message || "Unknown API error";
          debugLog.push(`Turn ${turns}: API error (status=${status}): ${errMsg}`);
          if (status === 429 && retries < maxRetries) {
            retries++;
            const delay = Math.pow(2, retries) * 2000;
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw apiErr;
        }
      }

      debugLog.push(`Turn ${turns}: stop_reason=${response.stop_reason}, blocks=${response.content.map(b => b.type).join(",")}`);

      // Log text blocks for debugging
      for (const block of response.content) {
        if (block.type === "text" && block.text) {
          debugLog.push(`Turn ${turns} text: ${block.text.slice(0, 200)}`);
        }
      }

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "end_turn") break;

      if (response.stop_reason === "tool_use") {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== "tool_use") continue;

          // Skip server-side tools (web_search is handled by Anthropic internally)
          if (block.name === "web_search") {
            debugLog.push(`Turn ${turns}: web_search called (server-side)`);
            continue;
          }

          const input = block.input as Record<string, unknown>;
          let result: string;

          debugLog.push(`Turn ${turns}: tool=${block.name}, input=${JSON.stringify(input).slice(0, 200)}`);

          if (block.name === "search_google_maps") {
            result = truncate(await searchGoogleMaps(
              input.query as string,
              input.location as string | undefined,
            ));
            debugLog.push(`Turn ${turns}: gmaps result length=${result.length}, preview=${result.slice(0, 100)}`);
          } else if (block.name === "search_comino") {
            result = truncate(await searchComino(input.query as string));
            debugLog.push(`Turn ${turns}: comino result length=${result.length}`);
          } else if (block.name === "scrape_emails") {
            result = truncate(await scrapeForEmails(input.url as string));
            debugLog.push(`Turn ${turns}: scrape result=${result.slice(0, 100)}`);
          } else if (block.name === "save_candidate") {
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
              sources: input.sources || [],
              source_query: seedQuery,
              status: "new",
            });

            if (error) {
              result = `Error saving: ${error.message}`;
              debugLog.push(`Turn ${turns}: save ERROR: ${error.message}`);
            } else {
              savedCount++;
              savedNames.push(input.name as string);
              result = `Saved "${input.name}" (score: ${input.score}/10)`;
              debugLog.push(`Turn ${turns}: SAVED ${input.name}`);
            }
          } else {
            debugLog.push(`Turn ${turns}: unknown tool ${block.name}`);
            continue;
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }

        // Only push tool results if we have custom tool results to report.
        // If the model only used web_search (server-side), the results are
        // already embedded in the response content — no user message needed,
        // but we must NOT continue the loop without a user message.
        if (toolResults.length > 0) {
          messages.push({ role: "user", content: toolResults });
        } else {
          // All tool_use blocks were server-side (web_search).
          // The response already contains the results, so we need to prompt
          // the model to continue processing with those results.
          debugLog.push(`Turn ${turns}: only server-side tools used, prompting continuation`);
          messages.push({
            role: "user",
            content: "Continúa analizando los resultados anteriores. Usa search_google_maps, search_comino o scrape_emails para encontrar candidatos, y save_candidate para guardarlos.",
          });
        }
      }
    }

    console.log("[Scout debug]", JSON.stringify(debugLog, null, 2));

    return NextResponse.json({
      success: true,
      savedCount,
      savedNames,
      turns,
      debug: debugLog,
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
