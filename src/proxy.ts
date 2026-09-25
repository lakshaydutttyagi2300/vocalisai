import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

const SESSION_COOKIES = ["next-auth.session-token", "__Secure-next-auth.session-token"];

// Every candidate-only route requires a valid session. Unauthenticated
// visitors are redirected to /login (mirrors authOptions.pages.signIn).
export async function proxy(req: NextRequest) {
  const isApi = req.nextUrl.pathname.startsWith("/api");
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Checked fresh from the database on every matched request, not trusted
  // from the JWT - a JWT issued before an admin suspends this account must
  // stop working on its very next request, not just the next login. This
  // is the real enforcement; src/lib/auth.ts's login-time check is the
  // other half (stops a suspended account from starting a *new* session).
  const user = await db.user.findUnique({ where: { id: token.id }, select: { isActive: true } });
  if (!user || !user.isActive) {
    if (isApi) return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });
    const res = NextResponse.redirect(new URL("/login?suspended=1", req.url));
    for (const name of SESSION_COOKIES) res.cookies.delete(name);
    return res;
  }

  // Admin routes need the ADMIN role, not just any signed-in candidate.
  // Redirected to /dashboard rather than /login since the visitor IS
  // authenticated - they're just not authorized for this section.
  if (req.nextUrl.pathname.startsWith("/admin") && token.role !== "ADMIN") {
    if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    "/billing/:path*",
    "/admin/:path*",
    "/exam/:path*", // P1-E exam runner v2 results
    // API equivalents - a suspended account or a candidate probing for
    // admin access must be blocked by calling the endpoint directly, not
    // just by the page around it being unreachable. /api/auth/*,
    // /api/webhooks/*, and /api/system-check/* are deliberately excluded:
    // they must stay reachable without (or before) a normal session.
    "/api/practice/:path*",
    "/api/mock-tests/:path*",
    "/api/coach/:path*",
    "/api/conversations/:path*",
    "/api/profile/:path*",
    "/api/billing/:path*",
    "/api/admin/:path*",
    "/api/exam-sessions/:path*", // P1-E exam runner v2
  ],
};
