import { describe, expect, it } from "vitest";
import { approvePost, emergencyStop, markPublished, resume, setMode } from "@/lib/social/actions";
import { HARD_DAILY_CAP } from "@/lib/social/agents/publishing";
import { computeWeights, MIN_SCORED_POSTS } from "@/lib/social/agents/improve";
import { deterministicFactIssues, qaProblems } from "@/lib/social/agents/review";
import { PermanentError, TransientError } from "@/lib/social/errors";
import { chooseDirection, HOOK_TYPES } from "@/lib/social/directions";
import { redact } from "@/lib/social/memory";
import { tick } from "@/lib/social/orchestrator";
import { bodyBudget } from "@/lib/social/agents/content";
import { composeText, trackedLink } from "@/lib/social/platforms";
import { findDuplicate } from "@/lib/social/uniqueness";
import type { Post } from "@/lib/social/types";
import { fakePlatform, makeCtx } from "./social-harness";

const HOUR = 3600_000;
async function runTicks(h: Awaited<ReturnType<typeof makeCtx>>, n = 6) { for (let i = 0; i < n; i++) await tick(h.ctx); }
const posts = (h: Awaited<ReturnType<typeof makeCtx>>) => h.store.listPosts({ limit: 100 });

describe("full operating cycle (autopilot)", () => {
  it("research -> plan -> write -> fact-check -> brief -> media -> QA -> schedule -> publish -> analytics -> learning", async () => {
    const h = await makeCtx({ mode: "autopilot" });
    await runTicks(h);
    // Research and audience notes exist, with the source and date recorded.
    const research = await h.store.listNotes("RESEARCH", 10);
    expect(research.some((n) => n.verified && n.sourceUrl === "https://news.example/a")).toBe(true);
    expect(research.some((n) => !n.verified)).toBe(true); // evergreen idea is labelled unverified
    expect((await h.store.listNotes("AUDIENCE", 5)).length).toBe(1);

    let all = await posts(h);
    expect(all).toHaveLength(2);
    expect(all.every((p) => p.status === "SCHEDULED")).toBe(true);
    expect(new Set(all.map((p) => p.hookText)).size).toBe(2);
    expect(h.bsky.published).toHaveLength(0); // scheduled for later today, not posted yet

    // The agents' task chain was recorded with timings.
    const kinds = (await h.store.listTasks({ limit: 200 })).map((t) => t.kind);
    for (const k of ["research.trends", "audience.analyze", "strategy.plan", "content.write", "content.factcheck", "creative.brief", "media.produce", "qa.review", "publish.post"]) expect(kinds).toContain(k);

    // Time passes: both slots (08:30 and 13:00 IST) arrive.
    h.advance(9 * HOUR); await runTicks(h, 3);
    all = await posts(h);
    expect(all.every((p) => p.status === "PUBLISHED")).toBe(true);
    expect(h.bsky.published).toHaveLength(2);
    expect(h.bsky.published.every((p) => p.hasImage)).toBe(true);

    // Analytics collects real numbers; platforms that report nothing stay null.
    h.advance(25 * HOUR); await runTicks(h, 3);
    const m = await h.store.latestMetrics(all.map((p) => p.id));
    expect(m.size).toBe(2);
    expect([...m.values()][0].saves).toBeNull();
    expect((await h.store.listNotes("DECISION", 5)).some((n) => /not enough data/i.test(n.title))).toBe(true); // 2 posts < 12: no strategy change
    expect(await h.store.getSetting("growth:weights")).toBeNull();

    // Reports distinguish results from suggestions.
    h.advance(24 * HOUR); await runTicks(h, 3);
    const report = (await h.store.listNotes("REPORT", 5))[0];
    expect(report.body).toMatch(/What happened/); expect(report.body).toMatch(/Suggestions/);
  });

  it("learns only from enough real data, and the learning changes the next plan", async () => {
    const h = await makeCtx({ mode: "autopilot" });
    const mk = async (i: number, hookType: string, likes: number) => {
      const p = await h.store.createPost({ platform: "bluesky", format: "image-post", topic: `t${i}`, direction: { hookType, narrative: "problem-solution", visualStyle: "checklist-card", cta: "save-this-for-later", pillar: "speaking-fluency", voiceStyle: "warm-and-slow" } });
      await h.store.updatePost(p.id, { status: "PUBLISHED", publishedAt: new Date(h.ctx.now().getTime() - 48 * HOUR), externalId: `id${i}` });
      await h.store.addMetric({ postId: p.id, collectedAt: h.ctx.now(), likes, replies: 0, shares: 0, saves: null, views: null });
    };
    for (let i = 0; i < 6; i++) await mk(i, "myth-bust", 30);
    for (let i = 6; i < 12; i++) await mk(i + 10, "question-to-viewer", 6);
    h.advance(2 * HOUR); await tick(h.ctx); // the daily optimizer is due at 06:30 India time
    const w = JSON.parse((await h.store.getSetting("growth:weights"))!);
    expect(w.hookType["myth-bust"]).toBeGreaterThan(1);
    expect(w.hookType["question-to-viewer"]).toBeLessThan(1);
    expect(w.hookType["myth-bust"]).toBeLessThanOrEqual(1.4);
    // Next direction prefers the proven hook (all else equal)...
    expect(chooseDirection([], w, () => 0).hookType).toBe("myth-bust");
    // ...but never repeats it back-to-back, so winners are not simply copied.
    expect(chooseDirection([{ hookType: "myth-bust" }], w, () => 0).hookType).not.toBe("myth-bust");
  });

  it("ignores metrics a platform does not report instead of learning from zeros", () => {
    const mkPost = (id: string, platform: Post["platform"]) => ({ id, platform, direction: { hookType: "myth-bust" } }) as unknown as Post;
    const { table } = computeWeights(Array.from({ length: MIN_SCORED_POSTS }, (_, i) => ({ post: mkPost(String(i), "bluesky"), score: 10 })));
    expect(table[0].relative).toBe(1); // everyone equal -> no change
  });
});

describe("modes", () => {
  it("supervised: prepares posts, publishes nothing until the owner approves", async () => {
    const h = await makeCtx({ mode: "supervised" });
    await runTicks(h);
    let all = await posts(h);
    expect(all.every((p) => p.status === "NEEDS_REVIEW")).toBe(true);
    h.advance(9 * HOUR); await runTicks(h, 2);
    expect(h.bsky.published).toHaveLength(0);
    const r = await approvePost(h.store, all[0].id, "owner", h.ctx.now());
    expect(r.ok).toBe(true);
    await runTicks(h, 2); h.advance(10 * 60_000); await runTicks(h, 2);
    expect(h.bsky.published).toHaveLength(1);
    all = await posts(h);
    expect(all.filter((p) => p.status === "PUBLISHED")).toHaveLength(1);
  });

  it("draft: creates content but never publishes, even if approved; leaving draft releases it", async () => {
    const h = await makeCtx({ mode: "draft" });
    await runTicks(h);
    const first = (await posts(h))[0];
    await approvePost(h.store, first.id, "owner", h.ctx.now());
    h.advance(5 * HOUR); await runTicks(h, 2);
    expect(h.bsky.published).toHaveLength(0);
    expect((await h.store.listTasks({ status: "BLOCKED", limit: 10 })).some((t) => t.kind === "publish.post")).toBe(true);
    await setMode(h.store, "supervised");
    h.ctx.config = { ...h.ctx.config, mode: "supervised" };
    await runTicks(h, 2);
    expect(h.bsky.published).toHaveLength(1);
  });

  it("emergency stop wins over autopilot, and resume releases the held posts", async () => {
    const h = await makeCtx({ mode: "autopilot" });
    await runTicks(h);
    await emergencyStop(h.store);
    h.advance(9 * HOUR); await runTicks(h, 3);
    expect(h.bsky.published).toHaveLength(0);
    expect((await posts(h)).every((p) => p.status === "SCHEDULED")).toBe(true);
    await resume(h.store);
    await runTicks(h, 3);
    expect(h.bsky.published).toHaveLength(2);
  });

  it("manual platforms (Instagram) get a validated dialogue video package and are never auto-posted", async () => {
    const h = await makeCtx({ mode: "autopilot", platforms: ["instagram"], postsPerDay: 1 });
    await runTicks(h);
    const p = (await posts(h))[0];
    expect(p.status).toBe("NEEDS_REVIEW");
    expect(p.format).toBe("reel");
    const scenes = p.content.video!.scenes;
    expect(scenes.length).toBeGreaterThanOrEqual(3);
    expect(new Set(scenes.map((s) => s.speaker)).size).toBeGreaterThanOrEqual(1);
    expect(p.content.video!.renderStatus).toBe("spec-only"); // honest: not rendered to video yet
    expect((await approvePost(h.store, p.id, "owner")).ok).toBe(true);
    expect((await h.store.getPost(p.id))!.status).toBe("APPROVED");
    expect((await markPublished(h.store, p.id, "owner", "https://instagram.com/reel/x")).ok).toBe(true);
    expect((await h.store.getPost(p.id))!.status).toBe("PUBLISHED");
  });
});

describe("publishing safety", () => {
  it("posts exactly once even if two workers get the same post", async () => {
    const h = await makeCtx({ mode: "autopilot" });
    await runTicks(h);
    const p = (await posts(h))[0];
    for (const k of ["dupA", "dupB", "dupC"]) await h.store.enqueue({ kind: "publish.post", agent: "publisher", dedupeKey: k, postId: p.id, payload: { postId: p.id } });
    h.advance(9 * HOUR);
    await tick(h.ctx);
    expect(h.bsky.published.filter((x) => x.text.includes(p.hookText.slice(0, 20)))).toHaveLength(1);
  });

  it("a temporary platform error leaves the post scheduled and retries without double posting", async () => {
    let fail = true;
    const flaky = fakePlatform("bluesky", { failWith: () => (fail ? new TransientError("503") : null) });
    const h = await makeCtx({ mode: "autopilot", postsPerDay: 1 }, { platforms: { bluesky: flaky.pub } });
    await runTicks(h);
    h.advance(9 * HOUR); await tick(h.ctx);
    let p = (await posts(h))[0];
    expect(p.status).toBe("SCHEDULED"); expect(flaky.published).toHaveLength(0);
    fail = false; h.advance(HOUR); await tick(h.ctx);
    p = (await posts(h))[0];
    expect(p.status).toBe("PUBLISHED"); expect(flaky.published).toHaveLength(1);
  });

  it("three permanent failures in a row switch publishing off and alert the owner", async () => {
    const dead = fakePlatform("bluesky", { failWith: () => new PermanentError("401 bad password") });
    const h = await makeCtx({ mode: "autopilot", postsPerDay: 3 }, { platforms: { bluesky: dead.pub } });
    await runTicks(h);
    h.advance(15 * HOUR); await runTicks(h, 4);
    expect((await posts(h)).filter((p) => p.status === "FAILED").length).toBe(3);
    expect(await h.store.getSetting("stop")).toBe("1");
    expect(h.notifications.some((n) => /switched off automatically/.test(n))).toBe(true);
  });

  it("a post that missed its slot by half a day goes back for review instead of posting stale content", async () => {
    const h = await makeCtx({ mode: "autopilot", postsPerDay: 1 });
    await runTicks(h);
    h.advance(40 * HOUR); await tick(h.ctx);
    expect((await posts(h))[0].status).toBe("NEEDS_REVIEW");
    expect(h.bsky.published).toHaveLength(0);
  });

  it("respects the hard daily cap per platform", () => { expect(HARD_DAILY_CAP).toBeLessThanOrEqual(8); });
});

describe("quality control and uniqueness", () => {
  it("a post that keeps failing review is sent back at most twice, then rejected", async () => {
    const h = await makeCtx({ mode: "autopilot", postsPerDay: 1 }, { verdict: () => "revise" });
    await runTicks(h, 8);
    const p = (await posts(h))[0];
    expect(p.status).toBe("REJECTED"); expect(p.revisionCount).toBe(2);
    expect(h.calls["post copy"]).toBe(3); // original + 2 rewrites, then it stops
    expect(h.bsky.published).toHaveLength(0);
  });

  it("rejects statistics with no source, but allows ordinary numbers", () => {
    const base = { content: { claims: [], sources: [], body: "" } } as unknown as Post;
    expect(deterministicFactIssues({ ...base, content: { ...base.content, body: "73% of recruiters reject this answer" } })).not.toHaveLength(0);
    expect(deterministicFactIssues({ ...base, content: { ...base.content, body: "Study shows people talk faster when nervous" } })).not.toHaveLength(0);
    expect(deterministicFactIssues({ ...base, content: { ...base.content, body: "Try these 3 phrases for 5 minutes tonight" } })).toHaveLength(0);
  });

  it("QA catches hype, AI cliches, placeholders, over-long text; passes a clean post; a post is not its own duplicate", () => {
    const clean = { id: "p1", platform: "bluesky", format: "text-post", topic: "polite disagreement", direction: { cta: "save-this-for-later" }, content: { hook: "Disagree without drama", body: "Disagree without drama: start with what you agree on.", hashtags: ["Careers"], sources: [], claims: [] } } as unknown as Post;
    expect(qaProblems(clean, [{ id: "p1", hook: "Disagree without drama", body: clean.content.body!, topic: "polite disagreement" }], "https://x.test")).toEqual([]);
    const bad = (body: string) => qaProblems({ ...clean, content: { ...clean.content, hook: "Hook", body: `Hook ${body}` } } as Post, [], "https://x.test");
    expect(bad("guaranteed to get you hired")).toContain("Contains a guarantee or hype claim");
    expect(bad("a game-changer for you").join()).toMatch(/generic AI phrase/);
    expect(bad("[PLACEHOLDER] text").join()).toMatch(/placeholder/);
    expect(bad("x".repeat(400)).join()).toMatch(/allows 300/);
  });

  it("detects near-copies and same-opening hooks, but lets different posts through", () => {
    const past = [{ id: "a", hook: "Stop saying I am having two years experience", body: "Say I have two years of experience instead because have shows a fact about now", topic: "experience grammar" }];
    expect(findDuplicate({ hook: "Stop saying I am having two years of experience", body: "x", topic: "other" }, past)).toMatch(/Opens the same way|too close/);
    expect(findDuplicate({ hook: "A calmer way to open", body: "Say I have two years of experience instead because have shows a fact about now", topic: "other" }, past)).toMatch(/repeats/);
    expect(findDuplicate({ hook: "Salary talk made simple", body: "Name a range, then pause and let them respond before you add anything.", topic: "salary" }, past)).toBeNull();
  });

  it("direction rotation: no hook, story or style repeats within 3 posts across 60 posts, and all options get used", () => {
    const recent: Record<string, string>[] = [];
    let seed = 3; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const used = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const d = chooseDirection(recent, {}, rng) as unknown as Record<string, string>;
      for (const dim of ["hookType", "narrative", "visualStyle"]) expect(recent.slice(0, 3).map((r) => r[dim])).not.toContain(d[dim]);
      used.add(d.hookType); recent.unshift(d);
    }
    expect(used.size).toBe(HOOK_TYPES.length);
  });

  it("every planned post in a batch gets a different direction and topic", async () => {
    const h = await makeCtx({ mode: "supervised", postsPerDay: 3, platforms: ["bluesky", "telegram"], planDaysAhead: 1 }, { platforms: { bluesky: fakePlatform("bluesky").pub, telegram: fakePlatform("telegram").pub } });
    await runTicks(h, 8);
    const all = await posts(h);
    expect(all.length).toBeGreaterThanOrEqual(4);
    const key = (p: Post) => [p.direction.hookType, p.direction.narrative, p.direction.visualStyle].join("/");
    expect(new Set(all.map(key)).size).toBe(all.length);
    expect(new Set(all.map((p) => p.topic)).size).toBe(all.length);
  });
});

describe("community, memory and security", () => {
  it("drafts replies for questions, escalates complaints to the owner, and never posts a reply", async () => {
    const h = await makeCtx({ mode: "autopilot" });
    await tick(h.ctx);
    const comments = await h.store.listNotes("COMMENT", 10);
    expect(comments).toHaveLength(2);
    const complaint = comments.find((c) => /angry/.test(c.title))!;
    expect(JSON.parse(complaint.body).escalate).toBe(true);
    expect((await h.store.listNotes("ALERT", 10)).some((a) => /complaint/.test(a.title))).toBe(true);
    expect(h.notifications.some((n) => /complaint comment needs your reply/.test(n))).toBe(true);
    expect(h.bsky.published).toHaveLength(0);
    await tick(h.ctx); h.advance(4 * HOUR); await tick(h.ctx);
    expect(await h.store.listNotes("COMMENT", 10)).toHaveLength(2); // same comments are not processed twice
  });

  it("redacts credentials before they are stored", () => {
    expect(redact("token sk-abcdefghijklmnopqrstuvwx and postgresql://u:p@host/db")).not.toMatch(/sk-abc|postgresql:/);
    expect(redact("123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw0 ok")).toContain("[redacted]");
  });

  it("a Bluesky post with the real tracked link and a body exactly at budget passes QA; hashtags yield first", () => {
    const site = "https://vocalisai.vercel.app";
    const id = "cmgx1234567890abcdefghijk"; // 25-character id, like a real one
    const budget = bodyBudget("bluesky", true, site);
    const hook = "Say it calmly";
    const body = hook + " " + "a".repeat(budget - hook.length - 1);
    expect(body.length).toBe(budget);
    const post = { id, platform: "bluesky", format: "text-post", topic: "t", direction: { cta: "practice-free-at-vocalisai" }, content: { hook, body, hashtags: ["EnglishSpeaking", "InterviewTips", "Careers"], sources: [], claims: [] } } as unknown as Post;
    const text = composeText("bluesky", post.content, trackedLink(site, post));
    expect([...text].length).toBeLessThanOrEqual(300);
    expect(text).toContain(`${site}/go/${id}`);
    expect(qaProblems(post, [], site)).toEqual([]);
  });

  it("composes platform text with the tracked link only when the direction asks for it", () => {
    expect(composeText("bluesky", { body: "Hello", hashtags: ["a", "b", "c", "d"] }, "https://s.test/go/1")).toBe("Hello\n\nhttps://s.test/go/1\n#a #b #c");
    expect(composeText("bluesky", { body: "Hello", hashtags: [] })).toBe("Hello");
  });
});
