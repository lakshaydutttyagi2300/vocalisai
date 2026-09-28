import { NextResponse } from "next/server";
import type { Outcome } from "@/lib/email-verification";

// The JSON error response shared by the sign-up routes (never includes a code).
export function failure(result: Extract<Outcome, { ok: false }>) {
  return NextResponse.json(
    { error: result.error, retryAfterSeconds: result.retryAfterSeconds },
    { status: result.status, headers: result.retryAfterSeconds ? { "Retry-After": String(result.retryAfterSeconds) } : undefined }
  );
}
