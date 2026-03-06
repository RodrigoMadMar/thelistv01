import { NextRequest, NextResponse } from "next/server";
import type { Candidate } from "@/lib/supabase/types";

/* ── Auth check ── */
async function requireAdmin() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
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
  return supabase;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await requireAdmin();

    const { candidateId } = (await req.json()) as { candidateId: string };
    if (!candidateId) {
      return NextResponse.json({ error: "candidateId required" }, { status: 400 });
    }

    const { data: candidate, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (error || !candidate) {
      return NextResponse.json({ error: "Candidato no encontrado" }, { status: 404 });
    }

    const c = candidate as Candidate;

    /* ── Generate email via Claude ── */
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
            content: `Genera un email de outreach para invitar a "${c.name}" a ser host en thelist.cl.

Datos del candidato:
- Nombre: ${c.name}
- Categoría: ${c.category || "—"}
- Ubicación: ${c.location || "—"}
- Descripción: ${c.description || "—"}
- Instagram: ${c.instagram || "—"}
- Por qué es buen fit: ${c.reason || "—"}

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
  } catch (err) {
    const message = (err as Error).message;
    if (message === "No autorizado") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Generate email error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
