import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Same check every existing admin route does inline - signed in AND role
// ADMIN - factored out for the P1-G routes.
export async function requireAdmin(): Promise<
  { ok: true; adminId: string; adminEmail: string } | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, adminId: session.user.id, adminEmail: session.user.email ?? "unknown" };
}
