"use client";

import { useState } from "react";
import { AtSign, KeyRound } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-950 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

// The signed-in admin changes their own sign-in email (username) and password.
export default function AdminPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-5 pb-16 pt-10 sm:px-6">
      <p className="eyebrow">Admin settings</p>
      <h1 className="headline mt-2 text-3xl text-ink-950">Sign-in details</h1>
      <p className="mt-2 text-sm text-slate-600">For the admin account you&apos;re signed in with.</p>
      <ChangeEmail />
      <ChangePassword />
    </div>
  );
}

function ChangeEmail() {
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/username", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newEmail: email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "We couldn't change your sign-in email. Please try again.");
      setDone(data.email);
      setEmail("");
      setCurrent("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="sheet mt-6 grid gap-4 p-5" aria-labelledby="email-title">
      <h2 id="email-title" className="font-display font-bold text-ink-950">Change sign-in email (username)</h2>
      <label className="text-xs font-semibold text-slate-600">
        New sign-in email
        <input type="email" autoComplete="username" required maxLength={200} className={`${input} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="text-xs font-semibold text-slate-600">
        Current password
        <input type="password" autoComplete="current-password" required className={`${input} mt-1`} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Sign-in email changed to {done}. Use it next time you sign in.
        </p>
      )}
      <button disabled={busy} data-loading={busy || undefined} className="btn-primary">
        <Icon as={AtSign} />
        Change sign-in email
      </button>
    </form>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next !== confirm) return setError("The two new passwords don't match.");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "We couldn't change your password. Please try again.");
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="sheet mt-6 grid gap-4 p-5" aria-labelledby="password-title">
        <h2 id="password-title" className="font-display font-bold text-ink-950">Change password</h2>
        <p className="-mt-2 text-xs text-slate-500">Use at least 8 characters; a long phrase is safest.</p>
        <label className="text-xs font-semibold text-slate-600">
          Current password
          <input type="password" autoComplete="current-password" required className={`${input} mt-1`} value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          New password
          <input type="password" autoComplete="new-password" required minLength={8} maxLength={200} className={`${input} mt-1`} value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          New password again
          <input type="password" autoComplete="new-password" required minLength={8} maxLength={200} className={`${input} mt-1`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            Password changed. Use the new one next time you sign in.
          </p>
        )}
        <button disabled={busy} data-loading={busy || undefined} className="btn-primary">
          <Icon as={KeyRound} />
          Change password
        </button>
      </form>
    </div>
  );
}
