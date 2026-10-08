import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { TYPING_PASSAGES } from "@/lib/typing/passages";

// The save endpoint scores on the server, saves only for the signed-in user,
// and refuses unknown passages and empty or malformed tests.
let signedIn: { user: { id: string } } | null = null;
vi.mock("next-auth", () => ({ getServerSession: async () => signedIn }));
const { POST, GET } = await import("@/app/api/typing-results/route");

const stamp = Date.now();
const users: string[] = [];
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
async function user() {
  const u = await db.user.create({ data: { email: `typing-${stamp}-${users.length}@example.test`, passwordHash: "x", name: "Typing Test" } });
  users.push(u.id);
  return u.id;
}
const post = (body: unknown) => POST(new Request("http://localhost/api/typing-results", { method: "POST", body: JSON.stringify(body) }));
const passage = TYPING_PASSAGES[0];

describe("POST /api/typing-results", () => {
  beforeEach(() => {
    signedIn = null;
  });

  it("needs a signed-in user", async () => {
    expect((await post({ passageKey: passage.key, typed: "Dear", seconds: 30 })).status).toBe(401);
  });

  it("scores on the server and saves for this user only", async () => {
    const me = await user();
    signedIn = { user: { id: me } };
    const half = passage.text.split(" ").slice(0, 40).join(" ");
    const res = await post({ passageKey: passage.key, typed: half, seconds: 60, netWpm: 999, accuracy: 100 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toMatchObject({ accuracy: 100, durationSeconds: 60 });
    expect(body.result.netWpm).toBeLessThan(100); // the browser's 999 is ignored
    expect(await db.typingResult.count({ where: { userId: me } })).toBe(1);

    const other = await user();
    signedIn = { user: { id: other } };
    expect((await (await GET()).json()).results).toEqual([]);
  });

  it("refuses unknown passages, empty text and impossible times", async () => {
    signedIn = { user: { id: await user() } };
    expect((await post({ passageKey: "made-up", typed: "hello", seconds: 30 })).status).toBe(400);
    expect((await post({ passageKey: passage.key, typed: "   ", seconds: 30 })).status).toBe(400);
    expect((await post({ passageKey: passage.key, typed: "Dear", seconds: 1 })).status).toBe(400);
    expect((await post({ passageKey: passage.key, typed: "Dear", seconds: 9999 })).status).toBe(400);
    const res = await post({ passageKey: "made-up", typed: "hello", seconds: 30 });
    expect(await res.json()).toEqual({ error: "That test couldn't be saved. Please try again." });
  });
});
