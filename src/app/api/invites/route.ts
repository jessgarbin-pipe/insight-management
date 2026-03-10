import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrgIdFromRequest } from "@/lib/org-context";

// GET /api/invites - List pending invites for an org
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const orgId =
      request.nextUrl.searchParams.get("org_id") ||
      getOrgIdFromRequest(request);

    if (!orgId) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("invites")
      .select("id, email, role, expires_at, accepted_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Invites list error:", error);
      return NextResponse.json(
        { error: "Failed to fetch invites" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invites: data || [] });
  } catch (error) {
    console.error("Invites GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/invites - Create a new invite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { org_id, email, role } = body;

    if (!org_id || !email) {
      return NextResponse.json(
        { error: "org_id and email are required" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "member", "viewer"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${validRoles.join(", ")}` },
        { status: 422 }
      );
    }

    const supabase = createServerClient();

    // Check if there's already a pending invite for this email+org
    const { data: existing } = await supabase
      .from("invites")
      .select("id")
      .eq("org_id", org_id)
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An active invite already exists for this email" },
        { status: 409 }
      );
    }

    // Check if user is already a member
    // We need to check by email - find user ID first
    const { data: existingUser } = await supabase
      .from("org_members")
      .select("id, user_id")
      .eq("org_id", org_id);

    // We can't directly query auth.users by email with service role here,
    // but the invite will be harmless if they're already a member

    const { data: invite, error } = await supabase
      .from("invites")
      .insert({
        org_id,
        email: email.toLowerCase(),
        role: role || "member",
      })
      .select("id, token, email, role, expires_at")
      .single();

    if (error) {
      console.error("Invite creation error:", error);
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    // In a production app, you'd send an email here with the invite link
    // For now, return the token so the admin can share the link

    return NextResponse.json(
      {
        invite,
        invite_url: `/invite/${invite.token}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Invites POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
