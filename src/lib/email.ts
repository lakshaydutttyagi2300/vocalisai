import { Resend } from "resend";

// Lazily constructed so a missing RESEND_API_KEY only breaks at send time,
// not at import time (import time happens during build, before env vars
// from a deploy target are necessarily available).
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "VocalisAi <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    // No provider configured (e.g. local dev without a key) - fall back to
    // logging the link so the flow is still usable end-to-end.
    console.log(`[password-reset] RESEND_API_KEY not set - reset link for ${to}: ${resetUrl}`);
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your VocalisAi password",
    html: `
      <p>We received a request to reset your VocalisAi password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email - your password won't change.</p>
    `,
    text: `We received a request to reset your VocalisAi password.\n\nReset it here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  });
}
