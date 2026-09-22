"use client";

import { useEffect, useState } from "react";

interface AuditEntry {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;

  useEffect(() => {
    setError(null);
    fetch(`/api/admin/audit-log?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setEntries(data.entries);
          setTotal(data.total);
        }
      })
      .catch(() => setError("Couldn't load the audit log."));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink-950">Admin Activity Log</h1>
      <p className="mt-1 text-sm text-slate-600">
        Every administrative change - who, what, and when. Append-only; nothing here can be edited or deleted.
      </p>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="card mt-6 overflow-x-auto p-5">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="pb-2 pr-4">When</th>
              <th className="pb-2 pr-4">Admin</th>
              <th className="pb-2 pr-4">Action</th>
              <th className="pb-2 pr-4">Target</th>
              <th className="pb-2">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries?.map((e) => (
              <tr key={e.id} className="align-top">
                <td className="py-2 pr-4 whitespace-nowrap text-slate-500">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-4 text-ink-900">{e.adminEmail}</td>
                <td className="py-2 pr-4 font-mono text-xs text-brand-700">{e.action}</td>
                <td className="py-2 pr-4 text-slate-600">
                  {e.targetType}
                  {e.targetId ? ` #${e.targetId.slice(0, 8)}` : ""}
                </td>
                <td className="py-2 font-mono text-xs text-slate-500">
                  {e.before !== null && <div>before: {JSON.stringify(e.before)}</div>}
                  {e.after !== null && <div>after: {JSON.stringify(e.after)}</div>}
                </td>
              </tr>
            ))}
            {entries?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-slate-500">No admin actions recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
