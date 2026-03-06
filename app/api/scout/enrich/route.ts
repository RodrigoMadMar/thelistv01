import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enrichContactDeep } from "@/lib/scout/enrich-contact";

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
      .select("id, website, email, instagram")
      .eq("id", lead_id)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.website) {
      return NextResponse.json(
        { error: "Lead has no website to enrich from" },
        { status: 400 },
      );
    }

    const result = await enrichContactDeep(lead.website, lead.instagram);

    // Update in DB
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (result.email) {
      updates.email = result.email;
      updates.email_source = result.email_source;
    }
    if (result.instagram) {
      updates.instagram = result.instagram;
    }

    await supabase.from("leads").update(updates).eq("id", lead_id);

    return NextResponse.json({
      success: true,
      email: result.email,
      instagram: result.instagram,
      email_source: result.email_source,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Enrich error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
