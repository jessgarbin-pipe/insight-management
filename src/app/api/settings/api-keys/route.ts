import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server-component";
import { createServerClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/utils/api-keys";

// GET /api/settings/api-keys - List active API keys for the current user
export async function GET() {
  try {
    const supabase = await createServerComponentClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServerClient();
    const { data, error } = await admin
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("API keys list error:", error);
      return NextResponse.json(
        { error: "Failed to fetch API keys" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("API keys GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/settings/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { key, hash, prefix } = generateApiKey();

    const admin = createServerClient();
    const { error } = await admin.from("api_keys").insert({
      user_id: user.id,
      name,
      key_hash: hash,
      key_prefix: prefix,
    });

    if (error) {
      console.error("API key creation error:", error);
      return NextResponse.json(
        { error: "Failed to create API key" },
        { status: 500 }
      );
    }

    // Return the key only once - it is never stored in plaintext
    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    console.error("API keys POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
