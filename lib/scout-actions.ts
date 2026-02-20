"use server";

import { createClient } from "@/lib/supabase/server";
import type { Candidate, CandidateStatus } from "@/lib/supabase/types";
import { Resend } from "resend";

/* ── Helpers ── */

async function requireAdmin() {
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

/* ── Generate personalised outreach email via Claude ── */

async function generateOutreachEmail(candidate: Candidate): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
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
    throw new Error(`Claude API error: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/* ── Send outreach email ── */

export async function sendOutreachEmail(
  candidateId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await requireAdmin();

    // Get candidate
    const { data: candidate, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (error || !candidate) return { error: "Candidato no encontrado" };
    if (!candidate.email) return { error: "Candidato sin email registrado" };
    if (candidate.status === "contacted")
      return { error: "Ya fue contactado" };

    // Generate personalised email
    const emailHtml = await generateOutreachEmail(candidate as Candidate);

    // Send via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return { error: "RESEND_API_KEY no configurada" };

    const resend = new Resend(resendKey);
    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM || "thelist.cl <hola@thelist.cl>",
      to: candidate.email,
      subject: `${candidate.name} — te queremos en thelist`,
      html: emailHtml,
    });

    if (sendError) return { error: `Error enviando: ${sendError.message}` };

    // Update status
    await supabase
      .from("candidates")
      .update({
        status: "contacted",
        contacted_at: new Date().toISOString(),
        outreach_email: emailHtml,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId);

    return { success: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/* ── Update candidate status ── */

export async function updateCandidateStatus(
  candidateId: string,
  status: CandidateStatus,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await requireAdmin();

    const { error } = await supabase
      .from("candidates")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", candidateId);

    if (error) return { error: error.message };
    return { success: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/* ── Delete candidate ── */

export async function deleteCandidate(
  candidateId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await requireAdmin();

    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", candidateId);

    if (error) return { error: error.message };
    return { success: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
