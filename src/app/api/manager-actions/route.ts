import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateRequired } from "@/lib/utils/validation";
import { logAudit } from "@/lib/utils/audit";

const VALID_ACTION_TYPES = ["dismiss", "accept", "status_change", "rice_override"] as const;

// POST /api/manager-actions - Log a manager action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { valid, errors } = validateRequired(body, ["action_type"]);
    if (!valid) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    if (!VALID_ACTION_TYPES.includes(body.action_type)) {
      return NextResponse.json(
        { error: `action_type must be one of: ${VALID_ACTION_TYPES.join(", ")}` },
        { status: 422 }
      );
    }

    const supabase = createServerClient();

    // Extract user_id from auth header if present
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const { data, error } = await supabase
      .from("manager_actions")
      .insert({
        action_type: body.action_type,
        insight_id: body.insight_id ?? null,
        theme_id: body.theme_id ?? null,
        details: body.details ?? {},
        ...(userId ? { user_id: userId } : {}),
      })
      .select()
      .single();

    if (error) {
      console.error("Manager action insert error:", error);
      return NextResponse.json(
        { error: "Failed to log manager action" },
        { status: 500 }
      );
    }

    // Fire-and-forget audit log
    logAudit({
      user_id: userId,
      action: "create",
      table_name: "manager_actions",
      record_id: data.id,
      new_data: data as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Manager actions POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
