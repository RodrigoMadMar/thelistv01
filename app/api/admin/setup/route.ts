import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/admin/setup
 *
 * Promotes a user to admin role. Requires SCOUT_ADMIN_KEY for auth.
 * Body: { email: string }
 *
 * Also returns all profiles so you can see who exists.
 */
export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get("x-scout-key");
    if (!key || key !== process.env.SCOUT_ADMIN_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = (await req.json()) as { email?: string };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // List all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false });

    if (!email) {
      return NextResponse.json({
        message: "Send { email: 'your@email.com' } to promote to admin",
        profiles: profiles || [],
      });
    }

    // Promote to admin
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("email", email)
      .select("id, email, role");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json({
        error: `No profile found for ${email}. Register first at /register`,
        profiles: profiles || [],
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `${email} is now admin`,
      profile: updated[0],
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
