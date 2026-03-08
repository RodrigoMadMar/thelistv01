import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

/* ── Auth ── */
async function requireAdmin() {
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

/* ── Comino crawler helpers ── */
const USER_AGENT = "Mozilla/5.0 (compatible; thelistbot/1.0)";

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractSlugs(html: string): string[] {
  const regex = /href="https:\/\/comino\.cl\/guia\/([a-z0-9-]+)\/?"/gi;
  const slugs = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) slugs.add(match[1]);
  }
  return Array.from(slugs);
}

function extractDetail(html: string) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const name = h1 ? h1[1].replace(/<[^>]+>/g, "").trim() : null;

  const igMatch = html.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  const ig = igMatch ? `@${igMatch[1].replace(/\/$/, "")}` : null;
  const excluded = new Set(["p", "reel", "stories", "explore", "accounts"]);
  const instagram = ig && !excluded.has(ig.replace("@", "").toLowerCase()) ? ig : null;

  const telMatch = html.match(/tel:([+\d\s-]+)/i);
  const phone = telMatch ? telMatch[1].trim() : null;

  // Email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = (html.match(emailRegex) || []).filter(
    (e) =>
      !e.endsWith(".png") &&
      !e.endsWith(".jpg") &&
      !e.includes("wixpress") &&
      !e.includes("sentry") &&
      !e.includes("example"),
  );
  const email = emails[0] || null;

  // Website (non-social external link)
  const linkRegex = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/gi;
  let website: string | null = null;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const url = linkMatch[1];
    if (
      !url.includes("comino.cl") &&
      !url.includes("instagram.com") &&
      !url.includes("facebook.com") &&
      !url.includes("twitter.com") &&
      !url.includes("google.com")
    ) {
      website = url;
      break;
    }
  }

  // Description (longest paragraph)
  const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  let desc = "";
  for (const p of paragraphs) {
    const text = p.replace(/<[^>]+>/g, "").trim();
    if (text.length > desc.length && text.length > 50) desc = text;
  }

  return { name, instagram, phone, email, website, description: desc || null };
}

/* ── POST /api/scout/comino-scan ── */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!supabaseUrl || !supabaseKey)
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    if (!anthropicKey)
      return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

    const supabase = createClient(supabaseUrl, supabaseKey);
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // 1. Get existing candidate names to deduplicate
    const { data: existing } = await supabase
      .from("candidates")
      .select("name");
    const existingNames = new Set(
      (existing || []).map((c) => c.name.toLowerCase().trim()),
    );

    // 2. Crawl comino.cl/guia/
    const guiaHtml = await fetchPage("https://comino.cl/guia/");
    if (!guiaHtml)
      return NextResponse.json({ error: "No se pudo acceder a comino.cl" }, { status: 502 });

    const slugs = extractSlugs(guiaHtml);

    // 3. Fetch detail pages for all slugs, skip already-known
    interface CominoListing {
      slug: string;
      name: string;
      instagram: string | null;
      phone: string | null;
      email: string | null;
      website: string | null;
      description: string | null;
      url: string;
    }

    const newListings: CominoListing[] = [];

    for (const slug of slugs) {
      const url = `https://comino.cl/guia/${slug}/`;
      const html = await fetchPage(url);
      if (!html) continue;

      const detail = extractDetail(html);
      if (!detail.name) continue;

      // Skip if we already have this candidate
      if (existingNames.has(detail.name.toLowerCase().trim())) continue;

      newListings.push({
        slug,
        name: detail.name,
        instagram: detail.instagram,
        phone: detail.phone,
        email: detail.email,
        website: detail.website,
        description: detail.description,
        url,
      });

      // Polite crawling delay
      await new Promise((r) => setTimeout(r, 300));
    }

    if (newListings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay listings nuevos en Comino",
        totalSlugs: slugs.length,
        savedCount: 0,
        savedNames: [],
      });
    }

    // 4. Send to Claude for evaluation in batches
    const BATCH_SIZE = 10;
    let savedCount = 0;
    const savedNames: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < newListings.length; i += BATCH_SIZE) {
      const batch = newListings.slice(i, i + BATCH_SIZE);

      const listingsText = batch
        .map(
          (l, idx) =>
            `${idx + 1}. **${l.name}**\n   URL: ${l.url}\n   Instagram: ${l.instagram || "N/A"}\n   Email: ${l.email || "N/A"}\n   Web: ${l.website || "N/A"}\n   Descripción: ${l.description?.slice(0, 300) || "N/A"}`,
        )
        .join("\n\n");

      try {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: `Eres el scout de thelist.cl — plataforma de experiencias curadas para grupos pequeños en Chile.

Salas:
- La Buena Mesa (gastronomía de autor, chef experiences)
- Bar & Vino (coctelería, catas, wine bars)
- Arte & Experimental (talleres, galerías, experiencias creativas)
- Fiestas & Sesiones (DJ sets, música en vivo, sesiones íntimas)
- Outdoor (aventura, trekking, experiencias al aire libre)

Evalúa cada listing y devuelve un JSON array. Score 0-10: >=8 íntimo/único/curado, 6-7 buen fit, <6 descartado.

RESPONDE SOLO CON EL JSON ARRAY, sin markdown ni explicación:
[{"index": 1, "category": "Bar & Vino", "score": 7, "reason": "...", "location": "Santiago"}]

Solo incluye los que tienen score >= 6.

LISTINGS:
${listingsText}`,
            },
          ],
        });

        const text =
          response.content[0].type === "text" ? response.content[0].text : "";

        // Parse JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;

        const evaluations = JSON.parse(jsonMatch[0]) as Array<{
          index: number;
          category: string;
          score: number;
          reason: string;
          location?: string;
        }>;

        for (const ev of evaluations) {
          if (ev.score < 6) continue;
          const listing = batch[ev.index - 1];
          if (!listing) continue;

          const { error } = await supabase.from("candidates").insert({
            name: listing.name,
            category: ev.category,
            location: ev.location || "Chile",
            description: listing.description?.slice(0, 500) || null,
            instagram: listing.instagram,
            website: listing.website || listing.url,
            email: listing.email,
            score: ev.score,
            reason: ev.reason,
            sources: ["comino"],
            source_query: "comino-scan",
            status: "new",
          });

          if (error) {
            errors.push(`Error guardando ${listing.name}: ${error.message}`);
          } else {
            savedCount++;
            savedNames.push(listing.name);
          }
        }

        // Rate limit between batches
        if (i + BATCH_SIZE < newListings.length) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (err) {
        errors.push(`Error evaluando batch: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalSlugs: slugs.length,
      newListings: newListings.length,
      savedCount,
      savedNames,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "No autorizado")
      return NextResponse.json({ error: message }, { status: 401 });
    console.error("Comino scan error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
