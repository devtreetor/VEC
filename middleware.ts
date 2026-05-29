import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/gigs/post", "/gigs/manage", "/profile/edit", "/messages", "/notifications"];
const authRoutes = ["/auth", "/onboarding"];
const clientRoutes = ["/gigs/post", "/gigs/manage"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));
  const isClientRoute = clientRoutes.some((r) => pathname.startsWith(r));
  const isApiRoute = pathname.startsWith("/api");

  if (!user) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }
    if (isApiRoute && isProtected) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return supabaseResponse;
  }

  if (isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (isClientRoute) {
    const { data: dbUser } = await supabase
      .from("users")
      .select("roles")
      .eq("id", user.id)
      .single();

    if (!dbUser || !dbUser.roles.includes("client")) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Client role required" }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
