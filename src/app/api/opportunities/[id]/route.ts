import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateEnum } from "@/lib/utils/validation";
import { parsePagination, paginationMeta } from "@/lib/utils/pagination";
import { logAudit } from "@/lib/utils/audit";

const VALID_STATUSES = [
  "identified",
  "evaluating",
  "approved",
  "discarded",
] as const;

// GET /api/opportunities/:id - Detail with linked insights
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const { page, per_page, offset } = parsePagination(searchParams);

    // Fetch the opportunity
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    // Fetch linked insight IDs
    const { data: joinData, error: joinError } = await supabase
      .from("insight_opportunities")
      .select("insight_id")
      .eq("opportunity_id", id);

    if (joinError) {
      console.error("Opportunity insights join error:", joinError);
      return NextResponse.json(
        { error: "Failed to fetch opportunity insights" },
        { status: 500 }
      );
    }

    const insightIds = (joinData || []).map((r) => r.insight_id);

    if (insightIds.length === 0) {
      return NextResponse.json({
        ...opportunity,
        insights: {
          data: [],
          pagination: paginationMeta(page, per_page, 0),
        },
      });
    }

    // Fetch paginated insights
    const {
      data: insights,
      error: insightsError,
      count,
    } = await supabase
      .from("insights")
      .select("*", { count: "exact" })
      .in("id", insightIds)
      .order("priority_score", { ascending: false, nullsFirst: false })
      .range(offset, offset + per_page - 1);

    if (insightsError) {
      console.error("Opportunity insights fetch error:", insightsError);
      return NextResponse.json(
        { error: "Failed to fetch opportunity insights" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...opportunity,
      insights: {
        data: insights || [],
        pagination: paginationMeta(page, per_page, count || 0),
      },
    });
  } catch (error) {
    console.error("Opportunity detail GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/opportunities/:id - Update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    if (body.status === undefined) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    if (!validateEnum(body.status, VALID_STATUSES)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 422 }
      );
    }

    // Fetch current record for audit old_data
    const { data: existing } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("opportunities")
      .update({ status: body.status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Opportunity not found" },
          { status: 404 }
        );
      }
      console.error("Opportunity update error:", error);
      return NextResponse.json(
        { error: "Failed to update opportunity" },
        { status: 500 }
      );
    }

    // Fire-and-forget audit log
    logAudit({
      action: "update",
      table_name: "opportunities",
      record_id: id,
      old_data: existing as Record<string, unknown> | null,
      new_data: data as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Opportunity PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
