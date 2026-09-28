"use client";

import { useEffect, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

// Two steps: details -> the 6-digit code emailed to that address. The
// account only exists once the code is right (src/lib/email-verification.ts);
// the code itself is never sent to this page.
type Step = "details" | "code";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function post(path: string, body: object) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function handleDetails(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const { res, data } = await post("/api/auth/signup", { name, email, password });
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        if (res.status === 429 && data.retryAfterSeconds && data.error?.includes("just sent")) {
          // A code for this address is already on its way - go straight to it.
          setSentTo(email.trim().toLowerCase());
          setResendIn(data.retryAfterSeconds);
          setStep("code");
        }
        return;
      }
      setSentTo(data.email);
      setResendIn(data.resendInSeconds ?? 60);
      setCode("");
      setStep("code");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const { res, data } = await post("/api/auth/signup/verify", { email: sentTo, code });
      if (!res.ok) {
        setError(data.error || "That code didn't work. Please try again.");
        if (res.status === 404) setStep("details");
        return;
      }
      const signInResult = await signIn("credentials", { email: sentTo, password, redirect: false });
      if (signInResult?.error) {
        setError("Your account is ready, but automatic login failed. Please log in.");
        router.push("/login");
        return;
      }
      // New accounts start by choosing a goal (they can skip to the dashboard).
      router.push("/goal/choose?welcome=1");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend() {
    setError(null);
    setNotice(null);
    try {
      const { res, data } = await post("/api/auth/signup/resend", { email: sentTo });
      if (!res.ok) {
        setError(data.error || "Couldn't send a new code. Please try again.");
        if (data.retryAfterSeconds) setResendIn(data.retryAfterSeconds);
        if (res.status === 404) setStep("details");
        return;
      }
      setCode("");
      setResendIn(data.resendInSeconds ?? 60);
      setNotice(`A new code is on its way to ${sentTo}.`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
  }

  if (step === "code") {
    return (
      <AuthShell>
        <h1 className="text-2xl font-semibold text-ink-950">Check your email</h1>
        <p className="mt-1 text-sm text-slate-600">
          We sent a 6-digit code to <span className="font-medium text-ink-900">{sentTo}</span>. Enter it below to finish creating your account.
          It expires in 10 minutes.
        </p>

        <form onSubmit={handleCode} className="mt-8 space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700">
              Verification code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input-field mt-1 text-center font-mono text-2xl tracking-[0.5em]"
              aria-describedby="code-help"
            />
            <p id="code-help" className="mt-1 text-xs text-slate-500">
              Can&apos;t find it? Check your spam or promotions folder.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
              {notice}
            </p>
          )}

          <button type="submit" disabled={isSubmitting || code.length !== 6} data-loading={isSubmitting || undefined} className="btn-primary btn-lg w-full">
            {isSubmitting ? "Verifying..." : "Verify and create account"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <button type="button" onClick={resend} disabled={resendIn > 0} className="font-medium text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setError(null);
              setNotice(null);
            }}
            className="text-slate-600 hover:underline"
          >
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold text-ink-950">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">
        Start practicing for your English communication and Voice &amp; Accent assessment.
      </p>

      <form onSubmit={handleDetails} className="mt-8 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field mt-1"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field mt-1"
          />
          <p className="mt-1 text-xs text-slate-500">We&apos;ll email you a code to confirm it&apos;s yours.</p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mt-1"
          />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} data-loading={isSubmitting || undefined} className="btn-primary btn-lg w-full">
          {isSubmitting ? "Sending code..." : "Continue"}
        </button>
      </form>

      <p className="mt-4 text-xs text-slate-500">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="text-brand-600 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-brand-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
