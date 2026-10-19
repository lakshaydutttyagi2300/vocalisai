// Operator actions used by the control panel. Kept separate from the agents so
// every human decision goes through one audited, tested place.

import { publishTask } from "./agents/review";
import { AUTO_PLATFORMS, saveConfig, setStopped, type SocialConfig } from "./config";
import { PUBLIC_KINDS } from "./registry";
import type { SocialStore } from "./store";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

export async function approvePost(store: SocialStore, id: string, by: string, now = new Date()): Promise<ActionResult> {
  const post = await store.getPost(id);
  if (!post) return fail("That post no longer exists.");
  if (!["NEEDS_REVIEW", "DRAFT"].includes(post.status)) return fail(`This post is ${post.status.toLowerCase()} and cannot be approved.`);
  if (!AUTO_PLATFORMS.includes(post.platform)) {
    await store.transitionPost(id, ["NEEDS_REVIEW", "DRAFT"], "APPROVED", { decidedBy: by });
    return { ok: true, message: `Approved. ${post.platform} is posted by hand: copy the text and mark it published here when done.` };
  }
  const at = post.scheduledFor && post.scheduledFor.getTime() > now.getTime() ? post.scheduledFor : new Date(now.getTime() + 5 * 60_000);
  if (!(await store.transitionPost(id, ["NEEDS_REVIEW", "DRAFT"], "SCHEDULED", { decidedBy: by, scheduledFor: at, error: null }))) return fail("Someone else just changed this post.");
  await store.enqueue(publishTask(null, { id, scheduledFor: at }, `:a${now.getTime()}`));
  return { ok: true, message: `Approved and scheduled for ${at.toISOString()}.` };
}

export async function rejectPost(store: SocialStore, id: string, by: string, reason: string): Promise<ActionResult> {
  const ok = await store.transitionPost(id, ["NEEDS_REVIEW", "DRAFT", "APPROVED", "SCHEDULED", "FAILED"], "REJECTED", { decidedBy: by, error: reason.slice(0, 300) || "Rejected by owner" });
  return ok ? { ok: true, message: "Rejected." } : fail("This post cannot be rejected in its current state.");
}

/** For platforms we do not post to ourselves, or a post that went out but was not recorded. */
export async function markPublished(store: SocialStore, id: string, by: string, url: string | null, now = new Date()): Promise<ActionResult> {
  if (url) { try { new URL(url); } catch { return fail("That link is not a valid web address."); } }
  const ok = await store.transitionPost(id, ["APPROVED", "NEEDS_REVIEW", "PUBLISHING", "FAILED", "SCHEDULED"], "PUBLISHED", { decidedBy: by, publishedAt: now, externalUrl: url, error: null });
  return ok ? { ok: true, message: "Marked as published." } : fail("This post cannot be marked published in its current state.");
}

export async function setMode(store: SocialStore, mode: SocialConfig["mode"]): Promise<ActionResult> {
  await saveConfig(store, { mode });
  const woke = mode === "draft" ? 0 : await store.unblockTasks(PUBLIC_KINDS);
  return { ok: true, message: `Mode is now ${mode}.${woke ? ` ${woke} waiting post(s) released.` : ""}` };
}

export async function emergencyStop(store: SocialStore): Promise<ActionResult> {
  await setStopped(store, true);
  return { ok: true, message: "EMERGENCY STOP is on. Nothing will be published until you resume." };
}
export async function resume(store: SocialStore): Promise<ActionResult> {
  await setStopped(store, false);
  const woke = await store.unblockTasks(PUBLIC_KINDS);
  return { ok: true, message: `Publishing resumed.${woke ? ` ${woke} waiting post(s) released.` : ""}` };
}
