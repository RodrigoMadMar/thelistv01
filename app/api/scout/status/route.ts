import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function requireAuth(req: NextRequest) {
  const key = req.headers.get("x-scout-key");
  if (!key || key !== process.env.SCOUT_ADMIN_KEY) {
    throw new Error("Unauthorized");
  }
}

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const status = searchParams.get("status");
    const city = searchParams.get("city");
    const category = searchParams.get("category");
    const minRating = parseFloat(searchParams.get("minRating") || "0");
    const perPage = 50;
    const offset = (page - 1) * perPage;

    // Build query
    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (status) query = query.eq("status", status);
    if (city) query = query.eq("city", city);
    if (category) query = query.contains("category", [category]);
    if (minRating > 0) query = query.gte("rating", minRating);

    const { data: leads, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Stats
    const { data: allLeads } = await supabase
      .from("leads")
      .select("status, website, email");

    const stats = {
      total: allLeads?.length || 0,
      new: allLeads?.filter((l) => l.status === "new").length || 0,
      with_website: allLeads?.filter((l) => l.website).length || 0,
      with_email: allLeads?.filter((l) => l.email).length || 0,
    };

    // Recent runs
    const { data: recentRuns } = await supabase
      .from("scrape_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      leads: leads || [],
      total: count || 0,
      page,
      stats,
      recent_runs: recentRuns || [],
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
