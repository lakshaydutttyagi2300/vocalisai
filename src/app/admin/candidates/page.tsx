"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  mockSessionsCompleted: number;
  averageOverallScore: number | null;
  totalPracticeAttempts: number;
}

export default function AdminCandidatesPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setUsers(data.users);
      })
      .catch(() => setError("Couldn't load candidates."));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Candidates</h1>
      <p className="mt-1 text-sm text-slate-600">Every registered user, with their real activity and average score.</p>

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {!users && !error && (
        <div className="mt-6 h-64 animate-pulse rounded-lg bg-slate-200" />
      )}

      {users && (
        <div className="card mt-6 overflow-x-auto p-5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Sessions</th>
                <th className="pb-2 pr-4">Avg score</th>
                <th className="pb-2 pr-4">Attempts</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="group">
                  <td className="py-2 pr-4 font-medium text-ink-900">
                    {u.role === "CANDIDATE" ? (
                      <Link href={`/admin/candidates/${u.id}`} className="hover:text-brand-600 hover:underline">
                        {u.name}
                      </Link>
                    ) : (
                      u.name
                    )}
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
                  <td className="py-2 pr-4 text-slate-600">{u.mockSessionsCompleted}</td>
                  <td className="py-2 pr-4 text-slate-600">{u.averageOverallScore ?? "N/A"}</td>
                  <td className="py-2 pr-4 text-slate-600">{u.totalPracticeAttempts}</td>
                  <td className="py-2 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No users yet.</p>}
        </div>
      )}
    </div>
  );
}
