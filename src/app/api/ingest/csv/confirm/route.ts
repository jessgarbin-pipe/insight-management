import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parseCSV, applyMapping } from "@/lib/utils/csv";
import { processInsight } from "@/lib/pipeline/layer1";
import { getOrgIdFromRequest } from "@/lib/org-context";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 5000;

// POST /api/ingest/csv/confirm - Confirm mapping and process all rows
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mappingStr = formData.get("mapping") as string | null;

    if (!file || !mappingStr) {
      return NextResponse.json(
        { error: "file and mapping are required" },
        { status: 400 }
      );
    }

    let mapping: Record<string, string>;
    try {
      mapping = JSON.parse(mappingStr);
    } catch {
      return NextResponse.json(
        { error: "mapping must be valid JSON" },
        { status: 422 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 10MB" },
        { status: 422 }
      );
    }

    const text = await file.text();
    const { rows, totalRows } = parseCSV(text);

    if (totalRows === 0) {
      return NextResponse.json(
        { error: "CSV file contains no data rows" },
        { status: 422 }
      );
    }

    if (totalRows > MAX_ROWS) {
      return NextResponse.json(
        { error: `CSV file exceeds maximum of ${MAX_ROWS} rows` },
        { status: 422 }
      );
    }

    const supabase = createServerClient();
    const orgId = getOrgIdFromRequest(request);
    let success = 0;
    let failed = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mapped = applyMapping(row, mapping);

      // Validate required fields
      if (!mapped.title || mapped.title.trim() === "") {
        failed++;
        errors.push({ row: i + 1, reason: "Missing title" });
        continue;
      }
      if (!mapped.description || mapped.description.trim() === "") {
        failed++;
        errors.push({ row: i + 1, reason: "Missing description" });
        continue;
      }

      // Insert insight
      const { data, error } = await supabase
        .from("insights")
        .insert({
          title: mapped.title.trim(),
          description: mapped.description.trim(),
          source: mapped.source || "csv",
          metadata: mapped.metadata,
          ...(orgId ? { org_id: orgId } : {}),
        })
        .select("id")
        .single();

      if (error) {
        failed++;
        errors.push({ row: i + 1, reason: error.message });
        continue;
      }

      success++;

      // Fire-and-forget Layer 1 processing for each created insight
      try {
        processInsight(data.id).catch((err) => {
          console.error(
            "Layer 1 processing failed for CSV insight:",
            data.id,
            err
          );
        });
      } catch {
        // Silently handle if pipeline isn't fully implemented
      }
    }

    return NextResponse.json({
      total: totalRows,
      success,
      failed,
      errors,
    });
  } catch (error) {
    console.error("CSV confirm error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
