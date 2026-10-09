import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

const SESSION_COOKIES = ["next-auth.session-token", "__Secure-next-auth.session-token"];

// req.nextUrl.pathname keeps percent-encoding ("/api/%61dmin/users"), but the
// router looks paths up decoded and config.matcher is tested against the
// decoded path too - so that request still runs this proxy AND reaches
// /api/admin/users. The admin/API checks must look at the path the router
// will serve. Lower-cased and slash-collapsed only to make the admin check
// stricter; the path is never used to build a URL.
function routedPath(pathname: string): string {
  let path = pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // Undecodable: the router can't decode it either, so it can't resolve
    // to a different route than the raw path.
  }
  return path.replace(/[\\/]+/g, "/").toLowerCase();
}

// Every candidate-only route requires a valid session. Unauthenticated
// visitors are redirected to /login (mirrors authOptions.pages.signIn).
export async function proxy(req: NextRequest) {
  const path = routedPath(req.nextUrl.pathname);
  const isApi = path.startsWith("/api");
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Suspension and role are read fresh from the database on every matched
  // request, never trusted from the JWT (which is only written at login):
  // suspending or demoting someone must take effect on their very next
  // request, not when their token expires. src/lib/auth.ts's login-time
  // check is the other half (stops a suspended account starting a session).
  const user = await db.user.findUnique({ where: { id: token.id }, select: { isActive: true, role: true } });
  if (!user || !user.isActive) {
    if (isApi) return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });
    const res = NextResponse.redirect(new URL("/login?suspended=1", req.url));
    for (const name of SESSION_COOKIES) res.cookies.delete(name);
    return res;
  }

  // Admin pages AND admin APIs need the ADMIN role. Redirected to
  // /dashboard rather than /login since the visitor IS authenticated -
  // they're just not authorized for this section. Each /api/admin route
  // also checks the role itself (src/lib/admin-guard.ts) as a second layer.
  const isAdminArea = path.startsWith("/admin") || path.startsWith("/api/admin");
  if (isAdminArea && user.role !== "ADMIN") {
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
    "/speech-analysis/:path*",
    "/progress/:path*",
    "/coach/:path*",
    "/billing/:path*",
    "/admin/:path*",
    "/exam/:path*", // P1-E exam runner v2 results
    "/skills/:path*", // Skills platform: dashboard, drills, diagnostics
    "/goal/:path*", // Goal Tracks: choose a goal, goal plan
    "/readiness/:path*", // International Process readiness score
    "/practice-tests/:path*", // catalogue tests, history and review
    "/bookmarks/:path*",
    "/performance/:path*",
    "/certificates/:path*", // a candidate's own certificates (the public check is /verify)
    // API equivalents - a suspended account or a candidate probing for
    // admin access must be blocked by calling the endpoint directly, not
    // just by the page around it being unreachable. /api/auth/*,
    // /api/webhooks/*, and /api/system-check/* are deliberately excluded:
    // they must stay reachable without (or before) a normal session.
    "/api/practice/:path*",
    "/api/mock-tests/:path*",
    "/api/questions/:path*",
    "/api/coach/:path*",
    "/api/conversations/:path*",
    "/api/profile/:path*",
    "/api/billing/:path*",
    "/api/admin/:path*",
    "/api/exam-sessions/:path*", // P1-E exam runner v2
    "/api/skills/:path*",
    "/api/tts/:path*", // natural-voice playback
    "/api/goal/:path*",
    "/api/practice-tests/:path*",
    "/api/bookmarks/:path*",
    "/api/certificates/:path*",
    "/api/typing-results/:path*",
    "/api/email-reviews/:path*",
    "/api/chat-simulations/:path*",
  ],
};
