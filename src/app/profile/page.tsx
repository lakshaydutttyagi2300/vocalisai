"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, CreditCard, Target } from "lucide-react";
import { PROFILE_LIMITS } from "@/lib/profile-limits";
import { Icon } from "@/components/ui/Icon";
import { MediaHero } from "@/components/ui/MediaHero";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { HEROES } from "@/config/heroMedia";

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

  return (
    <div className="pb-20">
      <MediaHero {...HEROES.account} title="Your profile" subtitle="Your details and how VocalisAi looks for you. This information is private to your account." />
      <div className="page-container mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {loadError ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        ) : !profile ? (
          <div className="card space-y-4 p-6" aria-busy="true" aria-label="Loading your profile">
            <div className="h-10 animate-pulse rounded-md bg-slate-200" />
            <div className="h-10 animate-pulse rounded-md bg-slate-200" />
            <div className="h-10 animate-pulse rounded-md bg-slate-200" />
            <div className="h-24 animate-pulse rounded-md bg-slate-200" />
          </div>
        ) : (
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-fg">Your details</h2>
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
            maxLength={PROFILE_LIMITS.name}
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
            maxLength={PROFILE_LIMITS.targetRole}
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
            maxLength={PROFILE_LIMITS.bio}
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

        <button type="submit" disabled={isSaving} data-loading={isSaving || undefined} className="btn-primary">
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </form>
        )}

        <div className="grid gap-6">
          <section aria-labelledby="appearance-heading" className="card p-6">
            <h2 id="appearance-heading" className="text-lg font-semibold text-fg">
              Appearance
            </h2>
            <p className="mt-1 text-sm text-fg-muted">Light is the default. Dark is easier on the eyes at night. Saved in this browser.</p>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </section>
          <nav aria-label="More account pages" className="card divide-y divide-line overflow-hidden">
            {[
              { href: "/billing", label: "Plan & billing", detail: "Your plan and what you've used", icon: CreditCard },
              { href: "/goal", label: "My goal", detail: "What you're preparing for", icon: Target },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="group flex items-center gap-4 px-6 py-4 hover:bg-surface-muted">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                  <Icon as={l.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-fg">{l.label}</span>
                  <span className="block text-sm text-fg-muted">{l.detail}</span>
                </span>
                <Icon as={ArrowUpRight} className="flex-none text-fg-subtle group-hover:text-accent-strong" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
