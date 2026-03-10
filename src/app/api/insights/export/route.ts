import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const CSV_COLUMNS = [
  "title",
  "description",
  "source",
  "status",
  "priority_score",
  "sentiment",
  "urgency",
  "type",
  "created_at",
] as const;

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/insights/export - Export insights as CSV
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;

    const themeId = searchParams.get("theme_id");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    let insightIds: string[] | null = null;

    if (themeId) {
      const { data: joinData, error: joinError } = await supabase
        .from("insight_themes")
        .select("insight_id")
        .eq("theme_id", themeId);

      if (joinError) {
        return NextResponse.json(
          { error: "Failed to fetch insights for theme" },
          { status: 500 }
        );
      }

      insightIds = (joinData || []).map((r) => r.insight_id);
      if (insightIds.length === 0) {
        const csv = CSV_COLUMNS.join(",") + "\n";
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition":
              'attachment; filename="insights-export.csv"',
          },
        });
      }
    }

    let query = supabase
      .from("insights")
      .select(CSV_COLUMNS.join(","))
      .order("priority_score", { ascending: false, nullsFirst: false });

    if (insightIds) {
      query = query.in("id", insightIds);
    }
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

    const { data, error } = await query;

    if (error) {
      console.error("Export error:", error);
      return NextResponse.json(
        { error: "Failed to export insights" },
        { status: 500 }
      );
    }

    const rows = (data || []).map((row) =>
      CSV_COLUMNS.map((col) =>
        escapeCSV(row[col as keyof typeof row] as string | number | null)
      ).join(",")
    );

    const csv = [CSV_COLUMNS.join(","), ...rows].join("\n") + "\n";

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="insights-export.csv"',
      },
    });
  } catch (error) {
    console.error("Export GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
