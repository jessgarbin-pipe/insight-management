import { NextRequest, NextResponse } from "next/server";
import { parseCSV, autoMapColumns } from "@/lib/utils/csv";
import { callClaude } from "@/lib/ai/claude";
import { csvMappingPrompt } from "@/lib/ai/prompts";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 5000;

interface CsvMappingResponse {
  mapping: Record<string, "title" | "description" | "source" | "metadata">;
}

// POST /api/ingest/csv/preview - Upload CSV, get auto-mapped column mapping + preview
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (
      !file.name.endsWith(".csv") &&
      file.type !== "text/csv" &&
      file.type !== "application/vnd.ms-excel"
    ) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 422 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 10MB" },
        { status: 422 }
      );
    }

    const text = await file.text();

    // Parse CSV
    const { headers, rows, totalRows } = parseCSV(text);

    if (headers.length === 0) {
      return NextResponse.json(
        { error: "Unable to detect column headers" },
        { status: 422 }
      );
    }

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

    // Preview first 5 rows
    const preview = rows.slice(0, 5);

    // Try Claude-powered mapping first, fall back to static keyword matching
    let mapping: Record<string, string>;
    try {
      const { system, user } = csvMappingPrompt(headers, preview);
      const result = await callClaude<CsvMappingResponse>(system, user);
      mapping = result.mapping;
    } catch (error) {
      console.warn("[CSV Preview] Claude mapping failed, using static fallback:", error);
      mapping = autoMapColumns(headers);
    }

    return NextResponse.json({
      mapping,
      preview,
      total_rows: totalRows,
      headers,
    });
  } catch (error) {
    console.error("CSV preview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
