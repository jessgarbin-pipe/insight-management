import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parsePagination, paginationMeta } from "@/lib/utils/pagination";
import { validateRequired } from "@/lib/utils/validation";
import { processInsight } from "@/lib/pipeline/layer1";
import { logAudit } from "@/lib/utils/audit";
import { hashApiKey } from "@/lib/utils/api-keys";
import { getOrgIdFromRequest } from "@/lib/org-context";

// GET /api/insights - List insights with filters, pagination, sorting
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const { page, per_page, offset } = parsePagination(searchParams);

    // Sorting
    const sortField = searchParams.get("sort") || "priority_score";
    const sortOrder = searchParams.get("order") || "desc";
    const validSortFields = ["priority_score", "created_at", "updated_at"];
    const resolvedSort = validSortFields.includes(sortField)
      ? sortField
      : "priority_score";
    const ascending = sortOrder === "asc";

    // Check if filtering by theme_id (requires join)
    const themeId = searchParams.get("theme_id");

    let query;
    let countQuery;

    if (themeId) {
      // Join through insight_themes to filter by theme
      query = supabase
        .from("insight_themes")
        .select("insight_id, insights(*)", { count: "exact" })
        .eq("theme_id", themeId);
      countQuery = supabase
        .from("insight_themes")
        .select("insight_id", { count: "exact", head: true })
        .eq("theme_id", themeId);
    } else {
      query = supabase
        .from("insights")
        .select("*", { count: "exact" });
      countQuery = null; // count comes from the main query
    }

    // Filters (applied to the insights table)
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    // Org scoping
    const orgId = getOrgIdFromRequest(request);

    if (!themeId) {
      // Apply org filter
      if (orgId) {
        query = query.eq("org_id", orgId);
      }
      // Apply filters directly on insights query
      if (status) {
        const statuses = status.split(",").map((s) => s.trim());
        query = query.in("status", statuses);
      }
      if (source) {
        query = query.eq("source", source);
      }
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%`
        );
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo);
      }

      // Pagination and sorting
      query = query
        .order(resolvedSort, {
          ascending,
          nullsFirst: false,
        })
        .range(offset, offset + per_page - 1);

      const { data, error, count } = await query;
      if (error) {
        console.error("Insights list error:", error);
        return NextResponse.json(
          { error: "Failed to fetch insights" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: data || [],
        pagination: paginationMeta(page, per_page, count || 0),
      });
    } else {
      // Theme-filtered query: need to extract insights from the join
      // Apply filters on the nested insights
      // Supabase doesn't support filtering on nested resources easily,
      // so we'll do a two-step approach: get insight IDs, then query insights
      const { data: joinData, error: joinError } = await supabase
        .from("insight_themes")
        .select("insight_id")
        .eq("theme_id", themeId);

      if (joinError) {
        console.error("Theme filter join error:", joinError);
        return NextResponse.json(
          { error: "Failed to fetch insights" },
          { status: 500 }
        );
      }

      const insightIds = (joinData || []).map((r) => r.insight_id);

      if (insightIds.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: paginationMeta(page, per_page, 0),
        });
      }

      let insightsQuery = supabase
        .from("insights")
        .select("*", { count: "exact" })
        .in("id", insightIds);

      if (orgId) {
        insightsQuery = insightsQuery.eq("org_id", orgId);
      }
      if (status) {
        const statuses = status.split(",").map((s) => s.trim());
        insightsQuery = insightsQuery.in("status", statuses);
      }
      if (source) {
        insightsQuery = insightsQuery.eq("source", source);
      }
      if (search) {
        insightsQuery = insightsQuery.or(
          `title.ilike.%${search}%,description.ilike.%${search}%`
        );
      }
      if (dateFrom) {
        insightsQuery = insightsQuery.gte("created_at", dateFrom);
      }
      if (dateTo) {
        insightsQuery = insightsQuery.lte("created_at", dateTo);
      }

      insightsQuery = insightsQuery
        .order(resolvedSort, { ascending, nullsFirst: false })
        .range(offset, offset + per_page - 1);

      const { data, error, count } = await insightsQuery;
      if (error) {
        console.error("Insights list (theme filter) error:", error);
        return NextResponse.json(
          { error: "Failed to fetch insights" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: data || [],
        pagination: paginationMeta(page, per_page, count || 0),
      });
    }
  } catch (error) {
    console.error("Insights GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/insights - Create a new insight
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { valid, errors } = validateRequired(body, ["title", "description"]);
    if (!valid) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    if (
      typeof body.title !== "string" ||
      typeof body.description !== "string"
    ) {
      return NextResponse.json(
        { error: "title and description must be strings" },
        { status: 422 }
      );
    }

    const supabase = createServerClient();

    // Extract user_id from auth header if present
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);

      if (token.startsWith("sk_")) {
        // API key authentication: hash the key and look up the owner
        const keyHash = hashApiKey(token);
        const { data: apiKey } = await supabase
          .from("api_keys")
          .select("id, user_id")
          .eq("key_hash", keyHash)
          .is("revoked_at", null)
          .single();

        if (!apiKey) {
          return NextResponse.json(
            { error: "Invalid API key" },
            { status: 401 }
          );
        }

        userId = apiKey.user_id;

        // Update last_used_at (fire-and-forget)
        supabase
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", apiKey.id)
          .then();
      } else {
        // Supabase session token authentication
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id ?? null;
      }
    }

    const { data, error } = await supabase
      .from("insights")
      .insert({
        title: body.title,
        description: body.description,
        source: body.source || "manual",
        metadata: body.metadata || {},
        ...(userId ? { user_id: userId } : {}),
      })
      .select()
      .single();

    if (error) {
      console.error("Insight creation error:", error);
      return NextResponse.json(
        { error: "Failed to create insight" },
        { status: 500 }
      );
    }

    // Fire-and-forget audit log
    logAudit({
      user_id: userId,
      action: "create",
      table_name: "insights",
      record_id: data.id,
      new_data: data,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    });

    // Fire-and-forget Layer 1 processing
    try {
      processInsight(data.id).catch((err) => {
        console.error("Layer 1 processing failed for insight:", data.id, err);
      });
    } catch {
      // Silently handle if pipeline isn't fully implemented
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Insights POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
