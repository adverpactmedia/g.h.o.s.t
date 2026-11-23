import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes enforce their own authentication or the private webhook HMAC.
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (isPublicPath(pathname)) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

  if (!supabaseUrl.startsWith("https://") || supabaseAnonKey.length < 20) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.searchParams.set("reason", "auth-not-configured");
    const redirect = NextResponse.redirect(target);
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(target);
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
