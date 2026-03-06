import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { LeadStatus } from "@/lib/scout/types";

const VALID_STATUSES: LeadStatus[] = [
  "new",
  "qualified",
  "emailed",
  "responded",
  "converted",
  "rejected",
];

function requireAuth(req: NextRequest) {
  const key = req.headers.get("x-scout-key");
  if (!key || key !== process.env.SCOUT_ADMIN_KEY) {
    throw new Error("Unauthorized");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    requireAuth(req);

    const { lead_id, status } = (await req.json()) as {
      lead_id: string;
      status: LeadStatus;
    };

    if (!lead_id || !status) {
      return NextResponse.json(
        { error: "lead_id and status required" },
        { status: 400 },
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Valid: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from("leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", lead_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead_id, status });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
