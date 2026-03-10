import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server-component";
import { createServerClient } from "@/lib/supabase/server";

// DELETE /api/settings/api-keys/:id - Revoke an API key
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerComponentClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServerClient();

    // Ensure the key belongs to this user before revoking
    const { data: existing } = await admin
      .from("api_keys")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const { error } = await admin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("API key revoke error:", error);
      return NextResponse.json(
        { error: "Failed to revoke API key" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API key DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
