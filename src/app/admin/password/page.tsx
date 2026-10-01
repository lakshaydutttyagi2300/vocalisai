"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-950 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

// The signed-in admin changes their own password.
export default function AdminPasswordPage() {
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
    <div className="mx-auto max-w-md px-5 pb-16 pt-10 sm:px-6">
      <p className="eyebrow">Admin settings</p>
      <h1 className="headline mt-2 text-3xl text-ink-950">Change password</h1>
      <p className="mt-2 text-sm text-slate-600">For the admin account you&apos;re signed in with. Use at least 8 characters; a long phrase is safest.</p>

      <form onSubmit={submit} className="sheet mt-6 grid gap-4 p-5">
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
