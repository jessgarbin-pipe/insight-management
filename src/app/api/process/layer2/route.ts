import { NextRequest, NextResponse } from "next/server";
import { runLayer2 } from "@/lib/pipeline/layer2";

// POST /api/process/layer2 - Trigger Layer 2 aggregate analysis
export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    // Accept either Bearer token or x-cron-secret header
    const token =
      authHeader?.replace("Bearer ", "") ||
      request.headers.get("x-cron-secret");

    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run Layer 2 pipeline
    const result = await runLayer2();

    return NextResponse.json({
      message: "Layer 2 processing complete",
      ...result,
    });
  } catch (error) {
    console.error("Layer 2 POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
