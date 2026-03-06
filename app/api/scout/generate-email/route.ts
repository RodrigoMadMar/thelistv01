import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { generateOutreachEmail } from "@/lib/scout/generate-email";
import type { Lead } from "@/lib/scout/types";

/* ── Auth: supports both x-scout-key (scout dashboard) and Supabase session (scouting page) ── */
async function authenticate(req: NextRequest): Promise<"scout-key" | "supabase-session"> {
  // 1. Try x-scout-key
  const key = req.headers.get("x-scout-key");
  if (key && key === process.env.SCOUT_ADMIN_KEY) {
    return "scout-key";
  }

  // 2. Try Supabase session (admin user)
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Unauthorized");
  return "supabase-session";
}

export async function POST(req: NextRequest) {
  try {
    const authMethod = await authenticate(req);
    const body = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const supabase = createServiceClient(supabaseUrl, supabaseKey);

    // ── Route A: Scouting page (candidateId → candidates table → HTML email) ──
    if (body.candidateId) {
      const { data: candidate, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", body.candidateId)
        .single();

      if (error || !candidate) {
        return NextResponse.json({ error: "Candidato no encontrado" }, { status: 404 });
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `Genera un email de outreach para invitar a "${candidate.name}" a ser host en thelist.cl.

Datos del candidato:
- Nombre: ${candidate.name}
- Categoría: ${candidate.category || "—"}
- Ubicación: ${candidate.location || "—"}
- Descripción: ${candidate.description || "—"}
- Instagram: ${candidate.instagram || "—"}
- Por qué es buen fit: ${candidate.reason || "—"}

Sobre thelist.cl:
- Plataforma de experiencias curadas en Chile
- Grupos pequeños (máx 20 personas)
- Salas: La Buena Mesa, Bar & Vino, Arte & Experimental, Fiestas & Sesiones, Outdoor
- Los hosts reciben el 90% del precio (10% fee)
- Cada experiencia se lanza como un "drop" exclusivo

Reglas:
- Tono cercano, directo, no corporativo. Tutear
- Máximo 120 palabras en el cuerpo
- Mencionar algo específico del candidato (que no parezca spam)
- CTA: invitar a responder el mail o agendar una llamada
- Firmar como "Equipo thelist.cl"
- Devolver SOLO el HTML del email, sin markdown, sin explicación
- Estilos inline: fondo #07080A, texto #F2F2EE, acentos #B7FF3C
- Font-family: -apple-system, sans-serif
- Un logo de texto "thelist.cl" arriba en serif
- Diseño minimalista, mucho espacio en blanco
- El botón CTA debe ser #B7FF3C con texto #07080A, border-radius 9999px`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 500 });
      }

      const data = await response.json();
      const html = data.content[0].text;
      return NextResponse.json({ html });
    }

    // ── Route B: Scout dashboard (lead_id → leads table → text email with fixed template) ──
    if (body.lead_id) {
      const { data: lead, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", body.lead_id)
        .single();

      if (error || !lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      const result = await generateOutreachEmail(lead as Lead);

      await supabase
        .from("leads")
        .update({
          generated_email_subject: result.subject,
          generated_email_body: result.body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.lead_id);

      return NextResponse.json({
        success: true,
        subject: result.subject,
        body: result.body,
        category_label: result.category_label,
      });
    }

    return NextResponse.json({ error: "candidateId or lead_id required" }, { status: 400 });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "Unauthorized" || message === "No autorizado") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Generate email error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
