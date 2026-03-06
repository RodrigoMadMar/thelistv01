import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateOutreachEmail } from "@/lib/scout/generate-email";
import type { Lead } from "@/lib/scout/types";

function requireAuth(req: NextRequest) {
  const key = req.headers.get("x-scout-key");
  if (!key || key !== process.env.SCOUT_ADMIN_KEY) {
    throw new Error("Unauthorized");
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);

    const { lead_id } = (await req.json()) as { lead_id: string };
    if (!lead_id) {
      return NextResponse.json({ error: "lead_id required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const { subject, body } = await generateOutreachEmail(lead as Lead);

    // Save to DB
    await supabase
      .from("leads")
      .update({
        generated_email_subject: subject,
        generated_email_body: body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead_id);

    return NextResponse.json({ success: true, subject, body });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Generate email error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
