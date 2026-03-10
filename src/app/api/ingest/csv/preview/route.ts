import { NextResponse } from "next/server";

// POST /api/ingest/csv/preview - Upload CSV, get auto-mapped column mapping + preview
export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
