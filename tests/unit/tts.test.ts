import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Phase 3 - natural voices (ElevenLabs). Storage, the session and the
// feature flag are mocked; ElevenLabs itself is a mocked fetch, so these
// tests never spend real credits or touch the real R2 bucket. Usage
// counting uses the TEST database.

const stored = vi.hoisted(() => new Map<string, Buffer>());
const storage = vi.hoisted(() => ({
  storedFileExists: vi.fn(async (key: string) => stored.has(key)),
  writeRecording: vi.fn(async (key: string, buf: Buffer) => void stored.set(key, buf)),
  readRecording: vi.fn(async (key: string) => {
    const b = stored.get(key);
    if (!b) throw new Error("missing");
    return b;
  }),
}));
const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
const flags = vi.hoisted(() => ({ on: true }));
vi.mock("@/lib/storage", async (orig) => ({ ...(await orig<typeof import("@/lib/storage")>()), ...storage }));
vi.mock("next-auth", () => session);
vi.mock("@/lib/feature-flags", async (orig) => ({
  ...(await orig<typeof import("@/lib/feature-flags")>()),
  isFeatureEnabled: vi.fn(async (key: string) => (key === "NATURAL_VOICES" ? flags.on : true)),
}));

const { db } = await import("@/lib/db");
const el = await import("@/lib/tts/elevenlabs");
const tts = await import("@/lib/tts/service");

const MP3 = Buffer.alloc(2048, 7);
let remainingCredits = 50_000;
let ttsCalls: { url: string; init: RequestInit }[] = [];
let failNext = false;

function mockElevenLabs() {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    if (String(url).endsWith("/user/subscription")) {
      return new Response(JSON.stringify({ character_count: 100_000 - remainingCredits, character_limit: 100_000 }), { status: 200 });
    }
    ttsCalls.push({ url: String(url), init });
    if (failNext) {
      failNext = false;
      return new Response("quota exceeded", { status: 401 });
    }
    return new Response(MP3, { status: 200, headers: { "Content-Type": "audio/mpeg" } });
  }));
}

beforeEach(() => {
  stored.clear();
  ttsCalls = [];
  remainingCredits = 50_000;
  flags.on = true;
  process.env.ELEVENLABS_API_KEY = "test-key";
  el.resetElevenLabsQuotaCache();
  mockElevenLabs();
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ELEVENLABS_API_KEY;
});

describe("ElevenLabs client", () => {
  it("uses the cheapest model, the right voice per accent, and sends the key only as a header", async () => {
    expect(el.ttsModel()).toBe("eleven_flash_v2_5");
    expect(el.voiceFor("UK", "female")).toBe(el.DEFAULT_VOICES.UK.female);
    process.env.ELEVENLABS_VOICE_IN_M = "custom-voice";
    expect(el.voiceFor("IN", "male")).toBe("custom-voice");
    delete process.env.ELEVENLABS_VOICE_IN_M;
    expect(el.creditCost("x".repeat(100))).toBe(50); // flash = half a credit per character

    const audio = await el.elevenLabsSpeech("Hello there.", "voice123");
    expect(audio.equals(MP3)).toBe(true);
    const call = ttsCalls[0];
    expect(call.url).toContain("/text-to-speech/voice123");
    expect((call.init.headers as Record<string, string>)["xi-api-key"]).toBe("test-key");
    expect(String(call.init.body)).not.toContain("test-key");
    expect(JSON.parse(String(call.init.body))).toMatchObject({ text: "Hello there.", model_id: "eleven_flash_v2_5" });
  });

  it("reads the remaining credits (cached for a minute)", async () => {
    remainingCredits = 12_345;
    expect(await el.elevenLabsRemainingCredits(1_000)).toBe(12_345);
    remainingCredits = 1;
    expect(await el.elevenLabsRemainingCredits(30_000)).toBe(12_345); // cached
    expect(await el.elevenLabsRemainingCredits(70_000)).toBe(1); // refreshed
  });
});

describe("natural-voice service: cache, limits, safety margin, fallbacks", { timeout: 120_000 }, () => {
  const run = Date.now();
  let userId = "";

  beforeAll(async () => {
    const user = await db.user.create({ data: { email: `tts-${run}@example.test`, passwordHash: "x", name: "TTS Test" } });
    userId = user.id; // FREE plan by default: 5 new clips a day
  }, 60_000);
  afterAll(async () => {
    await db.usageEvent.deleteMany({ where: { userId } });
    await db.subscription.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
  }, 60_000);
  beforeEach(async () => {
    await db.usageEvent.deleteMany({ where: { userId, feature: tts.TTS_USAGE_FEATURE } });
  });

  const say = (text: string, accent: "IN" | "US" | "UK" = "IN") => tts.getSpeech({ userId, text, accent });

  it("generates once, stores it, counts one use - and replays from the cache for free", async () => {
    const first = await say("Thank you for calling.");
    expect(first).toMatchObject({ ok: true, cached: false });
    expect(ttsCalls).toHaveLength(1);
    expect(await db.usageEvent.count({ where: { userId, feature: tts.TTS_USAGE_FEATURE } })).toBe(1);

    const again = await say("  Thank   you for calling.  "); // same text after normalising
    expect(again).toMatchObject({ ok: true, cached: true });
    if (first.ok && again.ok) expect(again.id).toBe(first.id);
    expect(ttsCalls).toHaveLength(1); // no second paid call
    expect(await db.usageEvent.count({ where: { userId, feature: tts.TTS_USAGE_FEATURE } })).toBe(1);

    const other = await say("Thank you for calling.", "UK"); // different voice = different clip
    expect(other).toMatchObject({ ok: true, cached: false });
  });

  it("enforces the per-user daily limit on NEW clips only", async () => {
    for (let i = 0; i < tts.TTS_DAILY_LIMITS.FREE; i++) expect((await say(`Sentence number ${i}.`)).ok).toBe(true);
    expect(await say("One more new sentence.")).toEqual({ ok: false, reason: "daily_limit" });
    expect(await say("Sentence number 0.")).toMatchObject({ ok: true, cached: true }); // cached still plays
  });

  it("keeps a credit reserve, and falls back on provider errors without counting them", async () => {
    remainingCredits = tts.reserveCredits() + 5;
    el.resetElevenLabsQuotaCache();
    expect(await say("A sentence that would dip into the reserve.")).toEqual({ ok: false, reason: "budget" });

    remainingCredits = 50_000;
    el.resetElevenLabsQuotaCache();
    failNext = true;
    expect(await say("This one fails upstream.")).toEqual({ ok: false, reason: "provider_error" });
    expect(await db.usageEvent.count({ where: { userId, feature: tts.TTS_USAGE_FEATURE } })).toBe(0);
  });

  it("without a key or with the switch off: no new clips, but cached ones still play", async () => {
    await say("Already made.");
    delete process.env.ELEVENLABS_API_KEY;
    expect(await say("Brand new text.")).toEqual({ ok: false, reason: "not_configured" });
    expect(await say("Already made.")).toMatchObject({ ok: true, cached: true });
    process.env.ELEVENLABS_API_KEY = "test-key";
    flags.on = false;
    expect(await say("Another brand new text.")).toEqual({ ok: false, reason: "disabled" });
    expect(await say("")).toEqual({ ok: false, reason: "empty" });
    expect(await say("x".repeat(tts.MAX_TTS_CHARS + 1))).toEqual({ ok: false, reason: "too_long" });
  });
});

describe("POST /api/tts: only speaks text the candidate is allowed to hear", { timeout: 120_000 }, () => {
  const run = Date.now();
  const ids: { users: string[]; questions: string[] } = { users: [], questions: [] };
  let me = "";
  let readingId = "";
  let grammarId = "";
  let otherAttemptId = "";

  beforeAll(async () => {
    const a = await db.user.create({ data: { email: `tts-api-${run}@example.test`, passwordHash: "x", name: "Me" } });
    const b = await db.user.create({ data: { email: `tts-api-other-${run}@example.test`, passwordHash: "x", name: "Other" } });
    ids.users.push(a.id, b.id);
    me = a.id;
    const reading = await db.practiceQuestion.create({ data: { category: "READING", difficulty: "BEGINNER", type: "SHORT_ANSWER", prompt: `Read aloud ${run}`, passage: "Hello world.", expectedAnswer: "Hello world.", timeLimitSeconds: 30 } });
    const grammar = await db.practiceQuestion.create({ data: { category: "GRAMMAR", difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", prompt: `Grammar ${run}`, options: "[\"a\",\"b\"]", correctAnswer: "a", expectedAnswer: "secret", timeLimitSeconds: 30 } });
    ids.questions.push(reading.id, grammar.id);
    readingId = reading.id;
    grammarId = grammar.id;
    const attempt = await db.practiceAttempt.create({ data: { userId: b.id, questionId: reading.id, category: "READING", difficulty: "BEGINNER", timeTakenSeconds: 5 } });
    otherAttemptId = attempt.id;
    session.getServerSession.mockResolvedValue({ user: { id: me, email: a.email, role: "CANDIDATE" } });
  }, 60_000);
  afterAll(async () => {
    await db.practiceAttempt.deleteMany({ where: { userId: { in: ids.users } } });
    await db.usageEvent.deleteMany({ where: { userId: { in: ids.users } } });
    await db.subscription.deleteMany({ where: { userId: { in: ids.users } } });
    await db.user.deleteMany({ where: { id: { in: ids.users } } });
    await db.practiceQuestion.deleteMany({ where: { id: { in: ids.questions } } });
  }, 60_000);

  async function post(body: unknown) {
    const { POST } = await import("@/app/api/tts/route");
    return POST(new Request("http://localhost/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  }

  it("plays a read-aloud passage and serves the clip back", async () => {
    const res = await post({ source: { type: "question", questionId: readingId }, accent: "US" });
    const data = await res.json();
    expect(data).toMatchObject({ ok: true });
    const { GET } = await import("@/app/api/tts/audio/[id]/route");
    const audio = await GET(new Request(`http://localhost${data.url}`), { params: Promise.resolve({ id: data.url.split("/").pop() }) });
    expect(audio.status).toBe(200);
    expect(audio.headers.get("Content-Type")).toBe("audio/mpeg");
  });

  it("refuses other questions, other people's answers, and arbitrary long text", async () => {
    expect((await post({ source: { type: "question", questionId: grammarId } })).status).toBe(404);
    expect((await post({ source: { type: "improved-answer", attemptId: otherAttemptId } })).status).toBe(404);
    expect((await post({ source: { type: "phrase", text: "a".repeat(200) } })).status).toBe(404);
    expect((await post({ source: { type: "phrase", text: "<script>" } })).status).toBe(404);
    expect((await post({})).status).toBe(400);
  });

  it("without a key, answers with the text so the browser can use the device voice", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    const data = await (await post({ source: { type: "phrase", text: "Particularly" } })).json();
    expect(data).toMatchObject({ ok: false, reason: "not_configured", fallbackText: "Particularly" });
  });
});

describe("the ElevenLabs key stays on the server", () => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

  it("no client file imports the ElevenLabs module or reads the key, and there is no public variant", () => {
    const files = walk(path.resolve("src")).filter((f) => /\.(ts|tsx)$/.test(f));
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/NEXT_PUBLIC_ELEVEN/);
      if (/^["']use client["']/m.test(src)) {
        expect(src, f).not.toMatch(/tts\/elevenlabs|tts\/service|ELEVENLABS_API_KEY/);
      }
    }
  });
});
