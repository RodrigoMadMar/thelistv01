import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

/**
 * Check auth: if SCOUT_ADMIN_KEY is set, require it.
 * If no SCOUT_ADMIN_KEY is configured AND no admins exist yet, allow access (first-time setup).
 */
async function requireAuth(req: NextRequest, supabase: ReturnType<typeof getSupabase>) {
  const { searchParams } = new URL(req.url);
  const key = req.headers.get("x-scout-key") || searchParams.get("key");

  // If SCOUT_ADMIN_KEY is configured, require it
  if (process.env.SCOUT_ADMIN_KEY) {
    if (!key || key !== process.env.SCOUT_ADMIN_KEY) {
      throw new Error("Unauthorized");
    }
    return;
  }

  // No SCOUT_ADMIN_KEY configured — only allow if zero admins exist (first-time setup)
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  if (admins && admins.length > 0) {
    throw new Error("Unauthorized - SCOUT_ADMIN_KEY required (admins already exist)");
  }
}

/**
 * GET /api/admin/setup?email=contacto@thelist.cl
 *
 * First-time setup: no key needed if no admins exist yet.
 * After first admin is created: requires ?key=SCOUT_ADMIN_KEY
 *
 * If email is provided: promotes that user to admin
 * If no email: lists all profiles
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    await requireAuth(req, supabase);

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, role, created_at")
        .order("created_at", { ascending: false });

      return NextResponse.json({
        message: "Add &email=your@email.com to promote to admin",
        profiles: profiles || [],
      });
    }

    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("email", email)
      .select("id, email, role");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, role, created_at");
      return NextResponse.json({
        error: `No profile found for ${email}. Register first at /register`,
        profiles: profiles || [],
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `${email} is now admin. Go to /login`,
      profile: updated[0],
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith("Unauthorized")) {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST version (same logic, reads from body) */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    await requireAuth(req, supabase);

    const { email } = (await req.json()) as { email?: string };

    if (!email) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, role, created_at")
        .order("created_at", { ascending: false });
      return NextResponse.json({ profiles: profiles || [] });
    }

    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("email", email)
      .select("id, email, role");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: `No profile for ${email}` }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `${email} is now admin`, profile: updated[0] });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith("Unauthorized")) return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
