import { cookies } from "next/headers";
import { createServerComponentClient } from "@/lib/supabase/server-component";

const ORG_COOKIE_NAME = "org_id";

export interface OrgContext {
  orgId: string | null;
  orgName: string | null;
  orgSlug: string | null;
  role: string | null;
}

/**
 * Get current org context from cookie/header for server components and API routes.
 * Returns null orgId if user has no org or cookie is not set.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const cookieStore = await cookies();
  const orgId = cookieStore.get(ORG_COOKIE_NAME)?.value || null;

  if (!orgId) {
    return { orgId: null, orgName: null, orgSlug: null, role: null };
  }

  const supabase = await createServerComponentClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { orgId: null, orgName: null, orgSlug: null, role: null };
  }

  // Verify user is a member of this org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role, organizations(name, slug)")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { orgId: null, orgName: null, orgSlug: null, role: null };
  }

  const org = membership.organizations as unknown as {
    name: string;
    slug: string;
  } | null;

  return {
    orgId,
    orgName: org?.name || null,
    orgSlug: org?.slug || null,
    role: membership.role,
  };
}

/**
 * Get org_id from request headers or cookies for API routes.
 * This is a lightweight version that doesn't validate membership
 * (the service role client bypasses RLS anyway).
 */
export function getOrgIdFromRequest(request: Request): string | null {
  // Check custom header first (set by middleware or client)
  const headerOrgId = request.headers.get("x-org-id");
  if (headerOrgId) return headerOrgId;

  // Fall back to cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${ORG_COOKIE_NAME}=([^;]+)`));
  return match?.[1] || null;
}
