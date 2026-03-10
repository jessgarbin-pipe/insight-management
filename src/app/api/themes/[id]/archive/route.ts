import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST /api/themes/:id/archive - Archive all insights in a theme
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Verify theme exists
    const { data: theme, error: themeError } = await supabase
      .from("themes")
      .select("id")
      .eq("id", id)
      .single();

    if (themeError || !theme) {
      return NextResponse.json(
        { error: "Theme not found" },
        { status: 404 }
      );
    }

    // Get all insight IDs linked to this theme
    const { data: links } = await supabase
      .from("insight_themes")
      .select("insight_id")
      .eq("theme_id", id);

    const insightIds = (links || []).map((l) => l.insight_id);

    if (insightIds.length === 0) {
      return NextResponse.json({ archived: 0 });
    }

    // Archive all linked insights
    const { error: updateError } = await supabase
      .from("insights")
      .update({ status: "archived" })
      .in("id", insightIds);

    if (updateError) {
      console.error("Theme archive error:", updateError);
      return NextResponse.json(
        { error: "Failed to archive theme insights" },
        { status: 500 }
      );
    }

    return NextResponse.json({ archived: insightIds.length });
  } catch (error) {
    console.error("Theme archive POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
