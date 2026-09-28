import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/rate-limit";
import { startSignup } from "@/lib/email-verification";
import { failure } from "./failure";

// Step 1 of sign-up: checks the details and emails a 6-digit code. No
// account exists until POST /api/auth/signup/verify gets the right code
// (src/lib/email-verification.ts). The code is never in any response.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const result = await startSignup(body, getClientIp(req));
  if (!result.ok) return failure(result);
  return NextResponse.json(
    { verificationRequired: true, email: result.email, expiresInSeconds: result.expiresInSeconds, resendInSeconds: result.resendInSeconds },
    { status: 202 }
  );
}

