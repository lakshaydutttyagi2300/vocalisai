import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Every candidate-only route requires a valid session. Unauthenticated
// visitors are redirected to /login (mirrors authOptions.pages.signIn).
export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes need the ADMIN role, not just any signed-in candidate.
  // Redirected to /dashboard rather than /login since the visitor IS
  // authenticated - they're just not authorized for this section.
  if (req.nextUrl.pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/practice/:path*",
    "/mock-tests/:path*",
    "/progress/:path*",
    "/coach/:path*",
    "/admin/:path*",
  ],
};
