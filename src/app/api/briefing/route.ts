import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateBriefing } from "@/lib/pipeline/layer3";
import type { BriefingResponse } from "@/lib/types";

// POST /api/briefing - Generate or retrieve cached briefing
export async function POST() {
  try {
    const supabase = createServerClient();

    // Check if there are any insights at all
    const { count: insightCount } = await supabase
      .from("insights")
      .select("id", { count: "exact", head: true });

    if (!insightCount || insightCount === 0) {
      const emptyBriefing: BriefingResponse = {
        summary:
          "Welcome to Insight Management! You have no insights yet. Head to the Ingest page to add your first insights via manual entry or CSV upload.",
        generated_at: new Date().toISOString(),
        cached: false,
        items: [],
      };
      return NextResponse.json(emptyBriefing);
    }

    // Check cache: query MAX(updated_at) across insights, themes, opportunities
    const [insightsMax, themesMax, opportunitiesMax] = await Promise.all([
      supabase
        .from("insights")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("themes")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("opportunities")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const maxUpdatedAt = [
      insightsMax.data?.updated_at,
      themesMax.data?.updated_at,
      opportunitiesMax.data?.updated_at,
    ]
      .filter(Boolean)
      .sort()
      .pop();

    // Check for cached briefing
    const { data: cached } = await supabase
      .from("briefing_cache")
      .select("*")
      .eq("id", "latest")
      .single();

    if (cached) {
      const cachedGeneratedAt = new Date(cached.generated_at).getTime();
      const dataUpdatedAt = maxUpdatedAt
        ? new Date(maxUpdatedAt).getTime()
        : 0;

      // Return cached if data hasn't changed since generation
      if (dataUpdatedAt <= cachedGeneratedAt) {
        const cachedData = cached.data as BriefingResponse;
        return NextResponse.json({
          ...cachedData,
          cached: true,
        });
      }
    }

    // Generate new briefing
    const briefing = await generateBriefing();

    // Cache the result
    await supabase.from("briefing_cache").upsert({
      id: "latest",
      data: briefing,
      generated_at: briefing.generated_at,
    });

    return NextResponse.json(briefing);
  } catch (error) {
    console.error("Briefing POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
