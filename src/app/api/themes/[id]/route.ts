import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parsePagination, paginationMeta } from "@/lib/utils/pagination";

// GET /api/themes/:id - Theme detail with linked insights (paginated)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const { page, per_page, offset } = parsePagination(searchParams);

    // Fetch the theme
    const { data: theme, error: themeError } = await supabase
      .from("themes")
      .select("*")
      .eq("id", id)
      .single();

    if (themeError || !theme) {
      return NextResponse.json(
        { error: "Theme not found" },
        { status: 404 }
      );
    }

    // Fetch linked insight IDs
    const { data: joinData, error: joinError } = await supabase
      .from("insight_themes")
      .select("insight_id")
      .eq("theme_id", id);

    if (joinError) {
      console.error("Theme insights join error:", joinError);
      return NextResponse.json(
        { error: "Failed to fetch theme insights" },
        { status: 500 }
      );
    }

    const insightIds = (joinData || []).map((r) => r.insight_id);

    if (insightIds.length === 0) {
      return NextResponse.json({
        ...theme,
        insights: {
          data: [],
          pagination: paginationMeta(page, per_page, 0),
        },
      });
    }

    // Fetch paginated insights
    const { data: insights, error: insightsError, count } = await supabase
      .from("insights")
      .select("*", { count: "exact" })
      .in("id", insightIds)
      .order("priority_score", { ascending: false, nullsFirst: false })
      .range(offset, offset + per_page - 1);

    if (insightsError) {
      console.error("Theme insights fetch error:", insightsError);
      return NextResponse.json(
        { error: "Failed to fetch theme insights" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...theme,
      insights: {
        data: insights || [],
        pagination: paginationMeta(page, per_page, count || 0),
      },
    });
  } catch (error) {
    console.error("Theme detail GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
