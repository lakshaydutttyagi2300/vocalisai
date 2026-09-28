// Sign-up with an emailed one-time code. The account (User row) is created
// ONLY after the right code is entered - until then the details wait in
// EmailVerification, which can't log in or be used for anything.
//
// The code is 6 random digits, valid for CODE_TTL_MINUTES. It is never
// stored or returned to the browser: only codeHash = HMAC-SHA256 keyed with
// NEXTAUTH_SECRET over (email, code), compared in constant time. Limits:
//   - MAX_CODE_ATTEMPTS wrong codes per code, then a new code is needed;
//   - RESEND_COOLDOWN_SECONDS between codes to one email;
//   - MAX_SENDS_PER_HOUR codes per email, START_LIMIT sign-up starts per IP
//     per hour, VERIFY_LIMIT code checks per IP per 10 minutes.
// Before anything is stored the address is checked for a sane format and a
// domain that can receive mail (MX records).

import crypto from "node:crypto";
import { promises as dns } from "node:dns";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { EmailSendError, sendSignupCodeEmail } from "@/lib/email";

export const CODE_TTL_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_SENDS_PER_HOUR = 5;
export const START_LIMIT_PER_IP_HOUR = 10;
export const VERIFY_LIMIT_PER_IP_10MIN = 30;

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export type Outcome<T = Record<string, never>> = ({ ok: true } & T) | { ok: false; status: number; error: string; retryAfterSeconds?: number };

export interface Deps {
  /** Resolves true when the domain can receive email. */
  domainAccepts?: (domain: string) => Promise<boolean>;
  sendCode?: (to: string, name: string, code: string) => Promise<void>;
  generateCode?: () => string;
  now?: () => Date;
}

export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export function isValidEmailFormat(email: string): boolean {
  if (email.length > 254) return false;
  const [local] = email.split("@");
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  return EMAIL_RE.test(email);
}

/** True when the domain has mail servers (or, per RFC 5321, an address record). A null MX ("."), or no such domain, is false. Lookup trouble fails open. */
export async function domainAcceptsMail(domain: string): Promise<boolean> {
  const withTimeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000))]);
  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    if (mx.length === 0) return false;
    return !mx.every((r) => r.exchange === "" || r.exchange === ".");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND") return false; // no such domain
    if (code === "ENODATA") {
      // No MX: mail falls back to the domain's own address, if it has one.
      try {
        const a = await withTimeout(dns.resolve4(domain));
        return a.length > 0;
      } catch {
        return false;
      }
    }
    return true; // timeouts, resolver outages: don't block real people
  }
}

export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

export function hashCode(email: string, code: string): string {
  return crypto.createHmac("sha256", secret()).update(`signup-code:${email}:${code}`).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

async function sendFreshCode(email: string, name: string, deps: Deps) {
  const code = (deps.generateCode ?? generateCode)();
  const send = deps.sendCode ?? ((to: string, n: string, c: string) => sendSignupCodeEmail(to, n, c, CODE_TTL_MINUTES));
  await send(email, name, code);
  return hashCode(email, code);
}

const SEND_FAILED = {
  ok: false as const,
  status: 502,
  error: "We couldn't send the verification email right now. Please check the address and try again in a few minutes.",
};

export interface Started {
  email: string;
  expiresInSeconds: number;
  resendInSeconds: number;
}

/** Step 1: validate, then email a code. Nothing becomes an account here. */
export async function startSignup(input: { name?: unknown; email?: unknown; password?: unknown }, ip: string, deps: Deps = {}): Promise<Outcome<Started>> {
  const now = (deps.now ?? (() => new Date()))();
  const ipLimit = await checkRateLimit(`signup:ip:${ip}`, START_LIMIT_PER_IP_HOUR, 60 * 60);
  if (!ipLimit.allowed) return { ok: false, status: 429, error: "Too many sign-up attempts. Please try again later." };

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  if (name.length < 2 || name.length > 100) return { ok: false, status: 400, error: "Name must be between 2 and 100 characters." };
  if (!isValidEmailFormat(email)) return { ok: false, status: 400, error: "Enter a valid email address." };
  if (password.length < 8 || password.length > 200) return { ok: false, status: 400, error: "Password must be at least 8 characters." };

  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { ok: false, status: 409, error: "An account with this email already exists. Log in instead." };
  }
  if (!(await (deps.domainAccepts ?? domainAcceptsMail)(email.split("@")[1]))) {
    return { ok: false, status: 400, error: "This email address can't receive mail. Please check it and try again." };
  }

  // Housekeeping: forget sign-ups abandoned more than a day ago.
  await db.emailVerification.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });

  const pending = await db.emailVerification.findUnique({ where: { email } });
  if (pending) {
    const wait = RESEND_COOLDOWN_SECONDS - Math.floor((now.getTime() - pending.lastSentAt.getTime()) / 1000);
    if (wait > 0) return { ok: false, status: 429, error: `A code was just sent to this address. You can request another in ${wait} seconds.`, retryAfterSeconds: wait };
  }
  const sends = await checkRateLimit(`signup-code:email:${email}`, MAX_SENDS_PER_HOUR, 60 * 60);
  if (!sends.allowed) return { ok: false, status: 429, error: "Too many codes requested for this address. Please try again in an hour." };

  let codeHash: string;
  try {
    codeHash = await sendFreshCode(email, name, deps);
  } catch (err) {
    console.error(`[signup] code email to ${email} failed:`, err instanceof EmailSendError ? err.message : err);
    return SEND_FAILED;
  }

  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000);
  const passwordHash = await bcrypt.hash(password, 12);
  await db.emailVerification.upsert({
    where: { email },
    create: { email, name, passwordHash, codeHash, expiresAt, lastSentAt: now },
    update: { name, passwordHash, codeHash, expiresAt, attempts: 0, lastSentAt: now },
  });
  return { ok: true, email, expiresInSeconds: CODE_TTL_MINUTES * 60, resendInSeconds: RESEND_COOLDOWN_SECONDS };
}

/** Send a new code for a sign-up that is waiting (the old code stops working). */
export async function resendCode(rawEmail: unknown, ip: string, deps: Deps = {}): Promise<Outcome<Started>> {
  const now = (deps.now ?? (() => new Date()))();
  const email = normalizeEmail(rawEmail);
  const ipLimit = await checkRateLimit(`signup-resend:ip:${ip}`, START_LIMIT_PER_IP_HOUR * 2, 60 * 60);
  if (!ipLimit.allowed) return { ok: false, status: 429, error: "Too many requests. Please try again later." };

  const pending = email ? await db.emailVerification.findUnique({ where: { email } }) : null;
  if (!pending) return { ok: false, status: 404, error: "There's no sign-up waiting for this email. Please start again." };

  const wait = RESEND_COOLDOWN_SECONDS - Math.floor((now.getTime() - pending.lastSentAt.getTime()) / 1000);
  if (wait > 0) return { ok: false, status: 429, error: `Please wait ${wait} seconds before requesting another code.`, retryAfterSeconds: wait };
  const sends = await checkRateLimit(`signup-code:email:${email}`, MAX_SENDS_PER_HOUR, 60 * 60);
  if (!sends.allowed) return { ok: false, status: 429, error: "Too many codes requested for this address. Please try again in an hour." };

  let codeHash: string;
  try {
    codeHash = await sendFreshCode(email, pending.name, deps);
  } catch (err) {
    console.error(`[signup] code email to ${email} failed:`, err instanceof EmailSendError ? err.message : err);
    return SEND_FAILED;
  }
  await db.emailVerification.update({
    where: { email },
    data: { codeHash, attempts: 0, lastSentAt: now, expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000) },
  });
  return { ok: true, email, expiresInSeconds: CODE_TTL_MINUTES * 60, resendInSeconds: RESEND_COOLDOWN_SECONDS };
}

/** Step 2: the right code creates the account; anything else doesn't. */
export async function verifySignupCode(rawEmail: unknown, rawCode: unknown, ip: string, deps: Deps = {}): Promise<Outcome<{ userId: string; email: string }>> {
  const now = (deps.now ?? (() => new Date()))();
  const email = normalizeEmail(rawEmail);
  const code = typeof rawCode === "string" ? rawCode.replace(/\s/g, "") : "";

  const ipLimit = await checkRateLimit(`signup-verify:ip:${ip}`, VERIFY_LIMIT_PER_IP_10MIN, 10 * 60);
  if (!ipLimit.allowed) return { ok: false, status: 429, error: "Too many attempts. Please wait a few minutes and try again." };
  if (!/^\d{6}$/.test(code)) return { ok: false, status: 400, error: "Enter the 6-digit code from the email." };

  const pending = email ? await db.emailVerification.findUnique({ where: { email } }) : null;
  if (!pending) return { ok: false, status: 404, error: "There's no sign-up waiting for this email. Please start again." };
  if (pending.attempts >= MAX_CODE_ATTEMPTS) {
    return { ok: false, status: 429, error: "Too many wrong codes. Request a new code to try again." };
  }
  if (pending.expiresAt <= now) return { ok: false, status: 410, error: "This code has expired. Request a new code." };

  if (!sameHash(pending.codeHash, hashCode(email, code))) {
    // Counted atomically so parallel guesses can't all slip through.
    const updated = await db.emailVerification.update({ where: { email }, data: { attempts: { increment: 1 } }, select: { attempts: true } });
    const left = MAX_CODE_ATTEMPTS - updated.attempts;
    return left > 0
      ? { ok: false, status: 400, error: `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` }
      : { ok: false, status: 429, error: "Too many wrong codes. Request a new code to try again." };
  }

  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: pending.name, email, passwordHash: pending.passwordHash, profile: { create: {} } },
        select: { id: true },
      });
      await tx.emailVerification.delete({ where: { email } });
      return created;
    });
    return { ok: true, userId: user.id, email };
  } catch (err) {
    // Unique email: someone (or a second tab) finished first.
    if ((err as { code?: string }).code === "P2002") {
      await db.emailVerification.deleteMany({ where: { email } });
      return { ok: false, status: 409, error: "An account with this email already exists. Log in instead." };
    }
    throw err;
  }
}

