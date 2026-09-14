import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Every lookup below is scoped to session.user.id from the server-verified
// JWT - never to a client-supplied id - so a candidate can only ever read
// or write their own profile.

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, profile] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id } }),
    db.profile.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: user.name,
    email: user.email,
    targetRole: profile?.targetRole ?? "",
    bio: profile?.bio ?? "",
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, targetRole, bio } = body as { name?: string; targetRole?: string; bio?: string };

  if (name !== undefined && name.trim().length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
  }

  const userId = session.user.id;

  if (name !== undefined) {
    await db.user.update({ where: { id: userId }, data: { name: name.trim() } });
  }

  await db.profile.upsert({
    where: { userId },
    update: { targetRole: targetRole ?? "", bio: bio ?? "" },
    create: { userId, targetRole: targetRole ?? "", bio: bio ?? "" },
  });

  return NextResponse.json({ ok: true });
}
