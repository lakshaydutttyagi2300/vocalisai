// Sends a REAL password-reset email via Resend to the user's own verified
// address - the only address Resend's unverified sandbox can deliver to
// without a custom domain. Confirms the API call succeeds; the user
// confirms actual delivery by checking their inbox.

const BASE = "http://localhost:3000";
const REAL_EMAIL = "lakshaydutttyagi@gmail.com";
const PASSWORD = "RealEmailTest123";

async function main() {
  const signupRes = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Lakshay Dutt Tyagi", email: REAL_EMAIL, password: PASSWORD }),
  });
  const signupData = await signupRes.json();
  console.log(`Signup status: ${signupRes.status} (409 = already exists, both fine)`, signupData.error ?? signupData.email);

  console.log("\n--- Requesting a real password reset email via Resend ---");
  const forgotRes = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: REAL_EMAIL }),
  });
  const forgotData = await forgotRes.json();
  console.log(`Status: ${forgotRes.status}, message: ${forgotData.message}`);

  if (!forgotRes.ok) {
    console.error("TEST FAILED: request should succeed");
    process.exit(1);
  }

  console.log("\nRequest sent successfully. Check lakshaydutttyagi@gmail.com for the real email.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
