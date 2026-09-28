import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/rate-limit";
import { resendCode } from "@/lib/email-verification";
import { failure } from "../failure";

// Emails a new code for a sign-up that is waiting; the previous code stops working.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const result = await resendCode(body?.email, getClientIp(req));
  if (!result.ok) return failure(result);
  return NextResponse.json({ email: result.email, expiresInSeconds: result.expiresInSeconds, resendInSeconds: result.resendInSeconds });
}
