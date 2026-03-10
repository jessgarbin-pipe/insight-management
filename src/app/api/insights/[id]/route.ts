import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateEnum, validateNumericRange } from "@/lib/utils/validation";

const VALID_STATUSES = ["open", "related", "closed", "archived"] as const;

// GET /api/insights/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("insights")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Insight not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Insight GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/insights/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    // Validate the fields being updated
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!validateEnum(body.status, VALID_STATUSES)) {
        return NextResponse.json(
          { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 422 }
        );
      }
      updates.status = body.status;
    }

    if (body.priority_score !== undefined) {
      if (
        body.priority_score !== null &&
        !validateNumericRange(body.priority_score, 0, 100)
      ) {
        return NextResponse.json(
          { error: "priority_score must be between 0 and 100" },
          { status: 422 }
        );
      }
      updates.priority_score = body.priority_score;
    }

    if (body.metadata !== undefined) {
      if (typeof body.metadata !== "object" || Array.isArray(body.metadata)) {
        return NextResponse.json(
          { error: "metadata must be an object" },
          { status: 422 }
        );
      }
      updates.metadata = body.metadata;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Fetch current insight to check for status changes
    const { data: current, error: fetchError } = await supabase
      .from("insights")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json(
        { error: "Insight not found" },
        { status: 404 }
      );
    }

    // Update the insight
    const { data, error } = await supabase
      .from("insights")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Insight update error:", error);
      return NextResponse.json(
        { error: "Failed to update insight" },
        { status: 500 }
      );
    }

    // Log manager action if status changed
    if (updates.status && updates.status !== current.status) {
      await supabase.from("manager_actions").insert({
        action_type: "status_change",
        insight_id: id,
        details: {
          from_status: current.status,
          to_status: updates.status,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Insight PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/insights/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { error } = await supabase.from("insights").delete().eq("id", id);

    if (error) {
      console.error("Insight delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete insight" },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Insight DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
