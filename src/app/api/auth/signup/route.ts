import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_SECONDS = 60 * 60;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`signup:ip:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_SECONDS);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many signup attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, password } = body as { name?: string; email?: string; password?: string };

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      profile: { create: {} },
    },
  });

  return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
}
