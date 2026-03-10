import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { processInsight } from "@/lib/pipeline/layer1";

// POST /api/insights/:id/reprocess
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Fetch the insight to confirm it exists
    const { data: insight, error: fetchError } = await supabase
      .from("insights")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !insight) {
      return NextResponse.json(
        { error: "Insight not found" },
        { status: 404 }
      );
    }

    // Clear existing AI fields
    const { error: clearError } = await supabase
      .from("insights")
      .update({
        priority_score: null,
        sentiment: null,
        urgency: null,
        type: null,
        embedding: null,
      })
      .eq("id", id);

    if (clearError) {
      console.error("Reprocess clear error:", clearError);
      return NextResponse.json(
        { error: "Failed to clear AI fields" },
        { status: 500 }
      );
    }

    // Remove existing theme links (they'll be re-created by Layer 1)
    await supabase.from("insight_themes").delete().eq("insight_id", id);

    // Fire-and-forget Layer 1 re-processing
    try {
      processInsight(id).catch((err) => {
        console.error("Reprocess Layer 1 failed for insight:", id, err);
      });
    } catch {
      // Silently handle if pipeline isn't fully implemented
    }

    return NextResponse.json(
      { message: "Reprocessing started", id },
      { status: 202 }
    );
  } catch (error) {
    console.error("Reprocess POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
