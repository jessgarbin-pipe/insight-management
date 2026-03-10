import { NextResponse } from "next/server";

// GET /api/themes - List themes
export async function GET() {
  return NextResponse.json({ data: [], pagination: { page: 1, per_page: 25, total: 0, total_pages: 0 } });
}
