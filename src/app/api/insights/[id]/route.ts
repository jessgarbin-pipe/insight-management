import { NextResponse } from "next/server";

// GET /api/insights/:id
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

// PATCH /api/insights/:id
export async function PATCH() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

// DELETE /api/insights/:id
export async function DELETE() {
  return new NextResponse(null, { status: 204 });
}
