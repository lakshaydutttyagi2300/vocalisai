import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  CODE_TTL_MINUTES,
  MAX_CODE_ATTEMPTS,
  MAX_SENDS_PER_HOUR,
  RESEND_COOLDOWN_SECONDS,
  domainAcceptsMail,
  hashCode,
  isValidEmailFormat,
  resendCode,
  startSignup,
  verifySignupCode,
  type Deps,
} from "@/lib/email-verification";
import { emailDelivery } from "@/lib/email";
import { POST as signupRoute } from "@/app/api/auth/signup/route";

// Sign-up by emailed code (test database). No account may exist until the
// right code is entered; the code is never stored or returned.
process.env.EMAIL_DELIVERY = "log";
const run = Date.now();
const emailFor = (tag: string) => `otp-${tag}-${run}@example.org`;
const ipFor = (tag: string) => `10.9.${run % 250}.${tag.length + 1}-${tag}`;

function harness(start = new Date()) {
  let clock = start.getTime();
  const sent: { to: string; code: string }[] = [];
  let next = 100000;
  const deps: Deps = {
    domainAccepts: async () => true,
    sendCode: async (to, _name, code) => {
      sent.push({ to, code });
    },
    generateCode: () => String(next++),
    now: () => new Date(clock),
  };
  return { deps, sent, advance: (seconds: number) => (clock += seconds * 1000) };
}

const details = (tag: string) => ({ name: "Otp Tester", email: emailFor(tag), password: "correct-horse-battery" });

afterAll(async () => {
  await db.emailVerification.deleteMany({ where: { email: { contains: `-${run}@` } } });
  await db.user.deleteMany({ where: { email: { contains: `-${run}@` } } });
});

describe("email checks", () => {
  it("accepts normal addresses and rejects malformed ones", () => {
    for (const ok of ["a@b.co", "first.last+tag@mail.example.org", "x_y-z@sub.domain.in"]) expect(isValidEmailFormat(ok), ok).toBe(true);
    for (const bad of ["", "plain", "a@b", "a@@b.com", ".a@b.com", "a.@b.com", "a..b@c.com", "a b@c.com", "a@-b.com", "a@b.c_m"]) expect(isValidEmailFormat(bad), bad).toBe(false);
  });

  it("knows which domains can receive mail", async () => {
    expect(await domainAcceptsMail("gmail.com")).toBe(true);
    expect(await domainAcceptsMail(`no-such-domain-${run}.invalid`)).toBe(false);
  });
});

describe("sign-up by email code", { timeout: 60_000 }, () => {
  beforeAll(async () => {
    await db.user.create({ data: { name: "Existing", email: emailFor("taken"), passwordHash: "x" } });
  });

  it("rejects bad details, taken emails and domains that can't receive mail - storing nothing", async () => {
    const { deps, sent } = harness();
    expect(await startSignup({ ...details("v1"), email: "nope" }, ipFor("v"), deps)).toMatchObject({ ok: false, status: 400 });
    expect(await startSignup({ ...details("v2"), password: "short" }, ipFor("v"), deps)).toMatchObject({ ok: false, status: 400 });
    expect(await startSignup({ ...details("v3"), name: "A" }, ipFor("v"), deps)).toMatchObject({ ok: false, status: 400 });
    expect(await startSignup(details("taken"), ipFor("v"), deps)).toMatchObject({ ok: false, status: 409 });
    expect(await startSignup(details("nomail"), ipFor("v"), { ...deps, domainAccepts: async () => false })).toMatchObject({ ok: false, status: 400 });
    expect(sent).toHaveLength(0);
    expect(await db.emailVerification.count({ where: { email: { in: [emailFor("v1"), emailFor("v2"), emailFor("v3"), emailFor("nomail")] } } })).toBe(0);
  });

  it("the right code - and only the right code - creates the account", async () => {
    const { deps, sent } = harness();
    const started = await startSignup(details("happy"), ipFor("happy"), deps);
    expect(started).toEqual({ ok: true, email: emailFor("happy"), expiresInSeconds: CODE_TTL_MINUTES * 60, resendInSeconds: RESEND_COOLDOWN_SECONDS });
    expect(JSON.stringify(started)).not.toContain(sent[0].code); // never returned

    const pending = await db.emailVerification.findUniqueOrThrow({ where: { email: emailFor("happy") } });
    expect(pending.codeHash).toBe(hashCode(emailFor("happy"), sent[0].code));
    expect(pending.codeHash).not.toContain(sent[0].code);
    expect(await db.user.findUnique({ where: { email: emailFor("happy") } })).toBeNull(); // not an account yet

    const wrong = await verifySignupCode(emailFor("happy"), "000000", ipFor("happy"), deps);
    expect(wrong).toMatchObject({ ok: false, status: 400, error: expect.stringContaining(`${MAX_CODE_ATTEMPTS - 1} tries left`) });
    expect(await db.user.findUnique({ where: { email: emailFor("happy") } })).toBeNull();

    const right = await verifySignupCode(` ${emailFor("happy").toUpperCase()} `, sent[0].code, ipFor("happy"), deps);
    expect(right).toMatchObject({ ok: true, email: emailFor("happy") });
    const user = await db.user.findUniqueOrThrow({ where: { email: emailFor("happy") }, include: { profile: true } });
    expect(user.name).toBe("Otp Tester");
    expect(user.profile).not.toBeNull();
    expect(await bcrypt.compare("correct-horse-battery", user.passwordHash)).toBe(true);
    expect(await db.emailVerification.findUnique({ where: { email: emailFor("happy") } })).toBeNull(); // cleaned up

    // A second use of the same code does nothing.
    expect(await verifySignupCode(emailFor("happy"), sent[0].code, ipFor("happy"), deps)).toMatchObject({ ok: false, status: 404 });
  });

  it("codes expire", async () => {
    const { deps, sent, advance } = harness();
    await startSignup(details("expiry"), ipFor("expiry"), deps);
    advance(CODE_TTL_MINUTES * 60 + 1);
    expect(await verifySignupCode(emailFor("expiry"), sent[0].code, ipFor("expiry"), deps)).toMatchObject({ ok: false, status: 410 });
    expect(await db.user.findUnique({ where: { email: emailFor("expiry") } })).toBeNull();
  });

  it("wrong-code limit, resend cooldown, and a resent code replacing the old one", async () => {
    const { deps, sent, advance } = harness();
    await startSignup(details("limit"), ipFor("limit"), deps);

    // Too soon to resend (the page shows the countdown).
    expect(await resendCode(emailFor("limit"), ipFor("limit"), deps)).toMatchObject({ ok: false, status: 429, retryAfterSeconds: RESEND_COOLDOWN_SECONDS });

    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) await verifySignupCode(emailFor("limit"), "999999", ipFor("limit"), deps);
    // Even the right code is refused once the limit is reached.
    expect(await verifySignupCode(emailFor("limit"), sent[0].code, ipFor("limit"), deps)).toMatchObject({ ok: false, status: 429 });

    advance(RESEND_COOLDOWN_SECONDS);
    expect(await resendCode(emailFor("limit"), ipFor("limit"), deps)).toMatchObject({ ok: true });
    expect(sent).toHaveLength(2);
    expect(await verifySignupCode(emailFor("limit"), sent[0].code, ipFor("limit"), deps)).toMatchObject({ ok: false, status: 400 }); // old code dead
    expect(await verifySignupCode(emailFor("limit"), sent[1].code, ipFor("limit"), deps)).toMatchObject({ ok: true });
  });

  it("caps codes per email per hour", async () => {
    const { deps, advance } = harness();
    expect(await startSignup(details("cap"), ipFor("cap"), deps)).toMatchObject({ ok: true });
    for (let i = 1; i < MAX_SENDS_PER_HOUR; i++) {
      advance(RESEND_COOLDOWN_SECONDS);
      expect(await resendCode(emailFor("cap"), ipFor("cap"), deps), `send ${i + 1}`).toMatchObject({ ok: true });
    }
    advance(RESEND_COOLDOWN_SECONDS);
    expect(await resendCode(emailFor("cap"), ipFor("cap"), deps)).toMatchObject({ ok: false, status: 429 });
  });

  it("if the email can't be sent, nothing is stored and the person is told", async () => {
    const { deps } = harness();
    const failing: Deps = { ...deps, sendCode: async () => Promise.reject(new Error("smtp down")) };
    expect(await startSignup(details("fail"), ipFor("fail"), failing)).toMatchObject({ ok: false, status: 502 });
    expect(await db.emailVerification.findUnique({ where: { email: emailFor("fail") } })).toBeNull();
  });

  it("the sign-up API answers 202 with no code in it, and no account yet", async () => {
    expect(emailDelivery()).toBe("log");
    const res = await signupRoute(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ipFor("route") },
        body: JSON.stringify({ name: "Route Tester", email: `route-${run}@gmail.com`, password: "correct-horse-battery" }),
      })
    );
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["email", "expiresInSeconds", "resendInSeconds", "verificationRequired"]);
    expect(await db.user.findUnique({ where: { email: `route-${run}@gmail.com` } })).toBeNull();
    await db.emailVerification.deleteMany({ where: { email: `route-${run}@gmail.com` } });
  });
});
