import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // AUTH BYPASS: Authentication disabled temporarily for development
  // To re-enable, uncomment the block below and remove this bypass section
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, still handle org cookie setup
  if (user) {
    if (user && request.nextUrl.pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (
      !request.nextUrl.pathname.startsWith("/onboarding") &&
      !request.nextUrl.pathname.startsWith("/invite/") &&
      !request.nextUrl.pathname.startsWith("/api/") &&
      !request.nextUrl.pathname.startsWith("/auth/") &&
      request.nextUrl.pathname !== "/" &&
      request.nextUrl.pathname !== "/login"
    ) {
      const orgId = request.cookies.get("org_id")?.value;

      if (!orgId) {
        const { data: memberships } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .limit(1);

        if (!memberships || memberships.length === 0) {
          const url = request.nextUrl.clone();
          url.pathname = "/onboarding/create-org";
          return NextResponse.redirect(url);
        } else {
          supabaseResponse.cookies.set("org_id", memberships[0].org_id, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
            sameSite: "lax",
          });
        }
      }
    }
  }

  // No redirect to /login for unauthenticated users — all pages are accessible

  /*
  // ORIGINAL AUTH LOGIC — uncomment to re-enable authentication:
  const isAuthPage =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/auth/");

  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  const isPublicPage =
    isAuthPage ||
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/invite/");

  if (!user && !isPublicPage && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    !request.nextUrl.pathname.startsWith("/onboarding") &&
    !request.nextUrl.pathname.startsWith("/invite/") &&
    !request.nextUrl.pathname.startsWith("/api/") &&
    !isAuthPage &&
    request.nextUrl.pathname !== "/"
  ) {
    const orgId = request.cookies.get("org_id")?.value;

    if (!orgId) {
      const { data: memberships } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1);

      if (!memberships || memberships.length === 0) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding/create-org";
        return NextResponse.redirect(url);
      } else {
        supabaseResponse.cookies.set("org_id", memberships[0].org_id, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
      }
    }
  }
  */

  return supabaseResponse;
}
