import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parsePagination, paginationMeta } from "@/lib/utils/pagination";
import { validateRequired } from "@/lib/utils/validation";

// GET /api/opportunities - List opportunities ordered by impact
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const { page, per_page, offset } = parsePagination(searchParams);

    // Supabase doesn't support custom sort by enum mapping directly,
    // so we fetch all and sort in-memory, or use a workaround.
    // For MVP, fetch with count and sort by estimated_impact then by created_at.
    // We'll do a two-step: fetch all matching, sort, then paginate.
    const { data: allData, error: allError } = await supabase
      .from("opportunities")
      .select("*");

    if (allError) {
      console.error("Opportunities list error:", allError);
      return NextResponse.json(
        { error: "Failed to fetch opportunities" },
        { status: 500 }
      );
    }

    // Sort: high > medium > low > null
    const impactOrder: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    // Get insight counts for each opportunity
    const opportunityIds = (allData || []).map((o) => o.id);
    const insightCounts: Record<string, number> = {};

    if (opportunityIds.length > 0) {
      const { data: joinData } = await supabase
        .from("insight_opportunities")
        .select("opportunity_id");

      if (joinData) {
        for (const row of joinData) {
          insightCounts[row.opportunity_id] =
            (insightCounts[row.opportunity_id] || 0) + 1;
        }
      }
    }

    const sorted = (allData || []).sort((a, b) => {
      const impactA = impactOrder[a.estimated_impact ?? ""] ?? 3;
      const impactB = impactOrder[b.estimated_impact ?? ""] ?? 3;
      if (impactA !== impactB) return impactA - impactB;
      // Secondary sort by insight count (descending)
      const countA = insightCounts[a.id] || 0;
      const countB = insightCounts[b.id] || 0;
      return countB - countA;
    });

    const total = sorted.length;
    const paginated = sorted.slice(offset, offset + per_page);

    return NextResponse.json({
      data: paginated,
      pagination: paginationMeta(page, per_page, total),
    });
  } catch (error) {
    console.error("Opportunities GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/opportunities - Create a new opportunity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { valid, errors } = validateRequired(body, ["title"]);
    if (!valid) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("opportunities")
      .insert({
        title: body.title,
        description: body.description ?? null,
        estimated_impact: body.estimated_impact ?? null,
        theme_id: body.theme_id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Opportunity insert error:", error);
      return NextResponse.json(
        { error: "Failed to create opportunity" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Opportunities POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
