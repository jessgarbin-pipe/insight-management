import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/stats - Return aggregated stats for dashboard charts
export async function GET() {
  try {
    const supabase = createServerClient();

    // Daily volume: insights per day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();

    const { data: recentInsights } = await supabase
      .from("insights")
      .select("created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    const dailyCounts = new Map<string, number>();
    // Pre-fill all 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyCounts.set(d.toISOString().split("T")[0], 0);
    }
    if (recentInsights) {
      for (const row of recentInsights) {
        const day = new Date(row.created_at).toISOString().split("T")[0];
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
      }
    }
    const daily_volume = Array.from(dailyCounts.entries()).map(
      ([date, count]) => ({ date, count })
    );

    // Theme distribution: top 10 themes by insight_count
    const { data: themes } = await supabase
      .from("themes")
      .select("name, insight_count")
      .order("insight_count", { ascending: false })
      .limit(10);

    const theme_distribution = (themes || []).map((t) => ({
      name: t.name,
      count: t.insight_count,
    }));

    // Status breakdown
    const statuses = ["open", "related", "closed", "archived"] as const;
    const statusCounts = await Promise.all(
      statuses.map(async (status) => {
        const { count } = await supabase
          .from("insights")
          .select("id", { count: "exact", head: true })
          .eq("status", status);
        return { status, count: count || 0 };
      })
    );

    return NextResponse.json({
      daily_volume,
      theme_distribution,
      status_breakdown: statusCounts,
    });
  } catch (error) {
    console.error("Stats GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
