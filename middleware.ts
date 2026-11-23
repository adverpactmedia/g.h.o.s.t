import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/auth/signout"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The private STABLOCITY bridge uses its own request-body HMAC authentication.
  if (pathname.startsWith("/api/internal/")) return NextResponse.next();
  if (isPublicPath(pathname)) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

  if (!supabaseUrl.startsWith("https://") || supabaseAnonKey.length < 20) {
    if (pathname.startsWith("/api/")) return NextResponse.next();
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.searchParams.set("reason", "auth-not-configured");
    return NextResponse.redirect(target);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (pathname.startsWith("/api/")) return response;

  if (error || !data.user) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.searchParams.set("next", pathname);
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
