import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/rate-limit";
import { verifySignupCode } from "@/lib/email-verification";
import { failure } from "../failure";

// Step 2 of sign-up: the right code creates the account (the browser then
// logs in with the password it still holds).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
  const result = await verifySignupCode(body?.email, body?.code, getClientIp(req));
  if (!result.ok) return failure(result);
  return NextResponse.json({ id: result.userId, email: result.email }, { status: 201 });
}
