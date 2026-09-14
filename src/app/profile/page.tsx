"use client";

import { useEffect, useState, type FormEvent } from "react";

type ProfileData = {
  name: string;
  email: string;
  targetRole: string;
  bio: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/profile")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load profile.");
        return res.json();
      })
      .then((data: ProfileData) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load your profile. Please refresh the page.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          targetRole: profile.targetRole,
          bio: profile.bio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || "Failed to save changes.");
        return;
      }

      setSaveSuccess(true);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 space-y-4">
          <div className="h-10 animate-pulse rounded-md bg-slate-200" />
          <div className="h-10 animate-pulse rounded-md bg-slate-200" />
          <div className="h-24 animate-pulse rounded-md bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink-950">Your profile</h1>
      <p className="mt-1 text-sm text-slate-600">
        This information is private to your account.
      </p>

      <form onSubmit={handleSubmit} className="card mt-8 space-y-4 p-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={profile.email}
            disabled
            className="input-field mt-1"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className="input-field mt-1"
          />
        </div>

        <div>
          <label htmlFor="targetRole" className="block text-sm font-medium text-slate-700">
            Target role
          </label>
          <input
            id="targetRole"
            type="text"
            placeholder="e.g. Customer Service Associate"
            value={profile.targetRole}
            onChange={(e) => setProfile({ ...profile, targetRole: e.target.value })}
            className="input-field mt-1"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-slate-700">
            About you
          </label>
          <textarea
            id="bio"
            rows={4}
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            className="input-field mt-1"
          />
        </div>

        {saveError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Saved.
          </p>
        )}

        <button type="submit" disabled={isSaving} className="btn-primary">
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
