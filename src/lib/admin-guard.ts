import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Every /api/admin route starts with this: signed in AND role ADMIN. It's the
// second layer - src/proxy.ts checks the role fresh from the database first.
// This one reads the role from the login token, so a newly promoted admin
// must sign in again before admin APIs accept them.
export async function requireAdmin(): Promise<
  { ok: true; adminId: string; adminEmail: string } | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, adminId: session.user.id, adminEmail: session.user.email ?? "unknown" };
}
