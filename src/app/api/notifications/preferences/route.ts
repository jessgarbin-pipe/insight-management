import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/notifications/preferences - Get current user's notification preferences
export async function GET() {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Return defaults if no preferences exist yet
    if (!prefs) {
      return NextResponse.json({
        user_id: user.id,
        digest_frequency: "weekly",
        high_priority_alerts: true,
      });
    }

    return NextResponse.json(prefs);
  } catch (error) {
    console.error("Notification preferences GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications/preferences - Update current user's notification preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.digest_frequency !== undefined) {
      if (!["daily", "weekly", "off"].includes(body.digest_frequency)) {
        return NextResponse.json(
          { error: "digest_frequency must be daily, weekly, or off" },
          { status: 400 }
        );
      }
      updates.digest_frequency = body.digest_frequency;
    }

    if (body.high_priority_alerts !== undefined) {
      if (typeof body.high_priority_alerts !== "boolean") {
        return NextResponse.json(
          { error: "high_priority_alerts must be a boolean" },
          { status: 400 }
        );
      }
      updates.high_priority_alerts = body.high_priority_alerts;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Upsert: create if not exists, update if exists
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          ...updates,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Notification preferences upsert error:", error);
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Notification preferences PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
