import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parsePagination, paginationMeta } from "@/lib/utils/pagination";

// GET /api/themes - List themes with insight_count > 0
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const { page, per_page, offset } = parsePagination(searchParams);

    const { data, error, count } = await supabase
      .from("themes")
      .select("*", { count: "exact" })
      .gt("insight_count", 0)
      .order("aggregated_score", { ascending: false, nullsFirst: false })
      .range(offset, offset + per_page - 1);

    if (error) {
      console.error("Themes list error:", error);
      return NextResponse.json(
        { error: "Failed to fetch themes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: paginationMeta(page, per_page, count || 0),
    });
  } catch (error) {
    console.error("Themes GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
