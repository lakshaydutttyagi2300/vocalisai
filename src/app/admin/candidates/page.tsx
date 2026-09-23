"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  mockSessionsCompleted: number;
  averageOverallScore: number | null;
  totalPracticeAttempts: number;
}

const PLAN_OPTIONS = ["FREE", "STARTER", "PROFESSIONAL", "PREMIUM"];
const ROLE_OPTIONS = ["CANDIDATE", "ADMIN"];

function randomPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8) + "!A1";
}

export default function AdminCandidatesPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState(randomPassword());
  const [newRole, setNewRole] = useState("CANDIDATE");
  const [newPlan, setNewPlan] = useState("FREE");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    fetch(`/api/admin/users?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setUsers(data.users);
      })
      .catch(() => setError("Couldn't load candidates."));
  }, [search, role, status, refreshKey]);

  async function createAccount() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole, plan: newPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Couldn't create the account.");
        return;
      }
      setCreatedAccount({ email: newEmail, password: newPassword });
      setNewName("");
      setNewEmail("");
      setNewPassword(randomPassword());
      setNewRole("CANDIDATE");
      setNewPlan("FREE");
      setRefreshKey((k) => k + 1);
    } catch {
      setCreateError("Couldn't create the account.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteAccount(u: UserRow) {
    if (!window.confirm(`Permanently delete ${u.name} (${u.email})? This deletes all their data and cannot be undone.`)) {
      return;
    }
    setDeletingId(u.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/candidates/${u.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error ?? "Couldn't delete this account.");
        return;
      }
      setUsers((prev) => prev?.filter((row) => row.id !== u.id) ?? prev);
    } catch {
      setDeleteError("Couldn't delete this account.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Candidates</h1>
          <p className="mt-1 text-sm text-slate-600">Every registered user, with their real activity and average score.</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm((v) => !v);
            setCreatedAccount(null);
            setCreateError(null);
          }}
          className="btn-primary text-sm"
        >
          {showAddForm ? "Cancel" : "Add account"}
        </button>
      </div>

      {showAddForm && (
        <div className="card mt-4 p-5">
          <h2 className="font-display font-bold text-ink-900">Create a test or real account</h2>
          <p className="mt-1 text-xs text-slate-500">
            Creates the account directly with a starting role and plan - no self-signup needed. You can change
            the plan, role or status any time from the candidate&apos;s detail page.
          </p>

          {createdAccount ? (
            <div className="mt-4 rounded-md bg-green-50 px-3 py-3 text-sm text-green-800">
              <p className="font-semibold">Account created.</p>
              <p className="mt-1">
                Email: <span className="font-mono">{createdAccount.email}</span>
              </p>
              <p>
                Password: <span className="font-mono">{createdAccount.password}</span>
              </p>
              <p className="mt-1 text-xs text-green-700">Share this password with them - it won&apos;t be shown again.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-xs text-slate-600">
                Name
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="e.g. Test Candidate"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Email
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="e.g. test1@example.com"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Password
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPassword(randomPassword())}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Regenerate
                  </button>
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col text-xs text-slate-600">
                  Role
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Starting plan
                  <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {createError && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p>
          )}

          {!createdAccount && (
            <button onClick={createAccount} disabled={creating} className="btn-primary mt-4 text-sm disabled:opacity-60">
              {creating ? "Creating..." : "Create account"}
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {deleteError && (
        <p role="alert" className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>
      )}

      <div className="card mt-6 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs text-slate-600">
            Search name or email
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="e.g. rahul or @example.com"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">All</option>
              <option value="CANDIDATE">Candidate</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
        </div>

        {!users && !error && <div className="mt-4 h-64 animate-pulse rounded-lg bg-slate-200" />}

        {users && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Sessions</th>
                  <th className="pb-2 pr-4">Avg score</th>
                  <th className="pb-2 pr-4">Attempts</th>
                  <th className="pb-2 pr-4">Joined</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className={`group ${u.isActive ? "" : "opacity-60"}`}>
                    <td className="py-2 pr-4 font-medium text-ink-900">
                      <Link href={`/admin/candidates/${u.id}`} className="hover:text-brand-600 hover:underline">
                        {u.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{u.email}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role === "ADMIN" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`badge ${u.isActive ? "badge-skill" : ""}`} style={u.isActive ? {} : { backgroundColor: "#fee2e2", color: "#b91c1c" }}>
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{u.mockSessionsCompleted}</td>
                    <td className="py-2 pr-4 text-slate-600">{u.averageOverallScore ?? "N/A"}</td>
                    <td className="py-2 pr-4 text-slate-600">{u.totalPracticeAttempts}</td>
                    <td className="py-2 pr-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      {u.id === session?.user?.id ? (
                        <span className="text-xs text-slate-400">You</span>
                      ) : (
                        <button
                          onClick={() => deleteAccount(u)}
                          disabled={deletingId === u.id}
                          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
                        >
                          {deletingId === u.id ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No users match these filters.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
