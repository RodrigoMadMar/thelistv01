import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { discoverLeads } from "@/lib/scout/discover-gmaps";
import type { DiscoverRequest } from "@/lib/scout/types";

export const maxDuration = 60;

function requireAuth(req: NextRequest) {
  const key = req.headers.get("x-scout-key");
  if (!key || key !== process.env.SCOUT_ADMIN_KEY) {
    throw new Error("Unauthorized");
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);

    const body = (await req.json()) as DiscoverRequest;
    const { cities, categories } = body;

    if (!cities?.length || !categories?.length) {
      return NextResponse.json(
        { error: "cities and categories are required" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing source IDs for dedup
    const { data: existing } = await supabase
      .from("leads")
      .select("source_id")
      .eq("source", "google_maps");

    const existingIds = new Set((existing || []).map((r) => r.source_id));

    // Discover
    const result = await discoverLeads(cities, categories, existingIds);

    // Insert new leads
    let leadsInserted = 0;
    for (const lead of result.leads) {
      const { error } = await supabase.from("leads").insert(lead);
      if (error) {
        // 23505 = unique constraint violation (duplicate)
        if (error.code !== "23505") {
          result.errors.push(`Insert error for ${lead.name}: ${error.message}`);
        }
      } else {
        leadsInserted++;
      }
    }

    // Log scrape run
    await supabase.from("scrape_runs").insert({
      source: "google_maps",
      city: cities.join(", "),
      category: categories.join(", "),
      leads_found: result.leads_found,
      leads_new: leadsInserted,
      duration_seconds: result.duration_seconds,
      errors: result.errors.length > 0 ? result.errors : null,
    });

    return NextResponse.json({
      success: true,
      leads_found: result.leads_found,
      leads_inserted: leadsInserted,
      duration_seconds: result.duration_seconds,
      errors: result.errors,
      preview: result.leads.slice(0, 5).map((l) => ({
        name: l.name,
        city: l.city,
        rating: l.rating,
        website: l.website,
      })),
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Scout discover error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
