import { NextResponse } from "next/server";

// GET /api/insights - List insights with filters, pagination
export async function GET() {
  return NextResponse.json({ data: [], pagination: { page: 1, per_page: 25, total: 0, total_pages: 0 } });
}

// POST /api/insights - Create a new insight
export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
