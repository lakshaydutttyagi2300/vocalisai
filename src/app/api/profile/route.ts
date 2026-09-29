import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { PROFILE_LIMITS } from "@/lib/profile-limits";

const profileUpdateSchema = z.object(
  {
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(PROFILE_LIMITS.name, `Name must be at most ${PROFILE_LIMITS.name} characters.`).optional(),
    targetRole: z.string().trim().max(PROFILE_LIMITS.targetRole, `Target role must be at most ${PROFILE_LIMITS.targetRole} characters.`).optional(),
    bio: z.string().trim().max(PROFILE_LIMITS.bio, `Bio must be at most ${PROFILE_LIMITS.bio} characters.`).optional(),
  },
  { error: "Invalid request body." },
);

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

  const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }
  const { name, targetRole, bio } = parsed.data;
  const userId = session.user.id;

  if (name !== undefined) {
    await db.user.update({ where: { id: userId }, data: { name } });
  }

  // Only the fields that were sent change - omitting one leaves it as it was.
  await db.profile.upsert({
    where: { userId },
    update: { ...(targetRole !== undefined && { targetRole }), ...(bio !== undefined && { bio }) },
    create: { userId, targetRole: targetRole ?? "", bio: bio ?? "" },
  });

  return NextResponse.json({ ok: true });
}
