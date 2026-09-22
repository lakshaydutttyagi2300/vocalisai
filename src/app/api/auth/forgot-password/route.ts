import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const WINDOW_SECONDS = 60 * 60;
const IP_LIMIT = 10; // broad abuse (e.g. hammering random addresses)
const EMAIL_LIMIT = 3; // protects one person's inbox specifically

// Always returns the same generic message regardless of whether the email
// matches an account - never confirm or deny account existence to an
// unauthenticated caller.
const GENERIC_MESSAGE = "If an account exists for that email, we've sent a password reset link.";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(`forgot-password:ip:${ip}`, IP_LIMIT, WINDOW_SECONDS);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    // A per-email throttle only ever does anything when the account
    // exists, so - unlike the IP check above - it must never surface as
    // a distinct error: a 429 here would leak "this address is real and
    // has been requested a lot", exactly what GENERIC_MESSAGE exists to
    // avoid. Over the limit just means silently skip sending, same
    // response either way.
    const emailLimit = await checkRateLimit(`forgot-password:email:${email}`, EMAIL_LIMIT, WINDOW_SECONDS);
    if (emailLimit.allowed) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
      const resetUrl = `${origin}/reset-password?token=${rawToken}`;

      await sendPasswordResetEmail(user.email, resetUrl);
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
