import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parsePagination, paginationMeta } from "@/lib/utils/pagination";

// GET /api/audit-log - List audit log entries with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const { page, per_page, offset } = parsePagination(searchParams);

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" });

    // Filters
    const tableName = searchParams.get("table_name");
    if (tableName) {
      query = query.eq("table_name", tableName);
    }

    const userId = searchParams.get("user_id");
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const action = searchParams.get("action");
    if (action) {
      query = query.eq("action", action);
    }

    const recordId = searchParams.get("record_id");
    if (recordId) {
      query = query.eq("record_id", recordId);
    }

    const dateFrom = searchParams.get("date_from");
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    const dateTo = searchParams.get("date_to");
    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + per_page - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Audit log query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit log" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: paginationMeta(page, per_page, count || 0),
    });
  } catch (error) {
    console.error("Audit log GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
