import { test, expect, type Page } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { setUserTrack } from "@/lib/goal-tracks";
import { createTestUser, loginAs } from "./helpers";

// Phase 5 QA: open every public, candidate and admin page at laptop and
// phone width and collect - rather than stop at the first - every problem:
// a crash in the browser, a failed (5xx) request, an error page, or content
// wider than the screen (sideways scrolling on a phone). Full-page
// screenshots go to test-results/walkthrough/ for a visual review.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  permissions: ["camera", "microphone"],
});

const password = "correct-horse-battery-staple";
const SHOTS = "test-results/walkthrough";
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

const PUBLIC = ["/", "/product/speaking", "/product/interviews", "/product/personalised", "/use-cases", "/pricing", "/about", "/contact", "/login", "/signup", "/forgot-password", "/reset-password", "/privacy", "/terms", "/refund-policy"];

function watch(page: Page) {
  const found: string[] = [];
  page.on("pageerror", (e) => found.push(`crash: ${e.message.split("\n")[0]}`));
  page.on("response", (r) => {
    if (r.status() >= 500) found.push(`${r.status()} from ${new URL(r.url()).pathname}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) found.push(`console: ${m.text().split("\n")[0].slice(0, 200)}`);
  });
  return found;
}

async function visit(page: Page, found: string[], problems: string[], vp: string, path: string) {
  found.length = 0;
  const before = problems.length;
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(300); // let late client renders settle
  const where = `${vp} ${path}`;
  if (res && res.status() >= 400) problems.push(`${where}: page answered ${res.status()}`);
  const errorText = await page.getByText(/Application error|Internal Server Error|Unhandled Runtime Error|This page could not be found|Something went wrong/).count();
  if (errorText > 0) problems.push(`${where}: shows an error message`);
  const overflow = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= vw + 1) return null;
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > vw + 1 && !el.closest("nextjs-portal");
      })
      .slice(-3)
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.getAttribute("class") ?? "").split(" ").slice(0, 3).join(".")} (right ${Math.round(el.getBoundingClientRect().right)})`);
    return `${document.documentElement.scrollWidth}px wide on a ${vw}px screen: ${wide.join(" | ")}`;
  });
  if (overflow) problems.push(`${where}: sideways scroll - ${overflow}`);
  for (const f of found) problems.push(`${where}: ${f}`);
  for (const p of problems.slice(before)) console.log(`PROBLEM ${p}`); // live, so a crash can't hide them
  const file = path === "/" ? "home" : path.replace(/^\//, "").replace(/[/?=&]/g, "_").slice(0, 80);
  await page.screenshot({ path: `${SHOTS}/${vp}/${file}.png`, fullPage: true });
}

test("every page opens cleanly on a laptop and a phone", async ({ page }) => {
  test.setTimeout(900_000);
  const run = Date.now();
  const candidate = await createTestUser(`e2e-walk-${run}@example.test`, password, "Walk Through");
  const admin = await createTestUser(`e2e-walk-admin-${run}@example.test`, password, "Walk Admin");
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  await setPlan(candidate.id, "STARTER", { periodDays: 30 });
  const problems: string[] = [];
  const found = watch(page);

  try {
    // Data the detail pages need: a finished practice answer, a mock exam, a conversation, a goal.
    const question = await db.practiceQuestion.findFirstOrThrow({ where: { category: "GRAMMAR", type: "MULTIPLE_CHOICE", isActive: true } });
    const attempt = await db.practiceAttempt.create({
      data: { userId: candidate.id, questionId: question.id, category: "GRAMMAR", difficulty: question.difficulty, responseText: question.correctAnswer, isCorrect: true, timeTakenSeconds: 12, skillId: question.skillId, level: question.level },
    });
    const conversation = await db.conversationSession.create({
      data: { userId: candidate.id, role: "CONVERSATION_PARTNER", turns: { create: [{ turnIndex: 0, speaker: "ai", text: "Hi! How has your week been so far?" }] } },
    });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of PUBLIC) await visit(page, found, problems, vp.name, path);
    }

    await page.goto("/");
    await loginAs(page, candidate.email, password);
    const mock = await (await page.request.post("/api/mock-tests/sessions")).json();
    expect(mock.sessionId, "a mock exam could be created").toBeTruthy();
    await page.request.patch(`/api/mock-tests/sessions/${mock.sessionId}`);

    const candidatePages = [
      "/dashboard",
      "/goal/choose",
      "/goal",
      "/practice",
      "/practice/quick",
      "/practice/grammar",
      "/practice/reading-comprehension",
      "/practice/listening",
      "/practice/writing",
      "/practice/reading",
      "/practice/customer-service",
      "/practice/conversation",
      `/practice/conversation/${conversation.id}`,
      `/practice/results/${attempt.id}`,
      "/skills",
      "/skills/drill/ENG.GRM",
      "/skills/diagnostic/spk",
      "/mock-tests",
      "/mock-tests/history",
      `/mock-tests/results/${mock.sessionId}`,
      "/speech-analysis",
      "/progress",
      "/coach",
      "/billing",
      "/profile",
    ];
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await db.profile.updateMany({ where: { userId: candidate.id }, data: { goalTrackId: null } });
      for (const path of candidatePages) {
        if (path === "/goal") await setUserTrack(candidate.id, "BPO_SUPPORT"); // the plan page, with a goal chosen
        await visit(page, found, problems, vp.name, path);
      }
    }

    // What the first review of these screenshots found, kept as checks:
    // a typed answer has no recording to analyse...
    await page.goto(`/practice/results/${attempt.id}`);
    await expect(page.getByRole("heading", { name: "No recording for this answer" })).toBeVisible({ timeout: 30_000 });
    // ...an exam ended with nothing answered isn't "100 - interview ready"...
    await page.goto(`/mock-tests/results/${mock.sessionId}`);
    await expect(page.getByText("No answers were scored in this exam, so there is no readiness score.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("You're interview ready.")).toHaveCount(0);
    // ...and the coach page no longer scrolls itself down on a phone.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/coach");
    await expect(page.getByPlaceholder("Ask your coach...")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.scrollY), "coach page stays at the top").toBe(0);

    await page.context().clearCookies();
    await page.goto("/");
    await loginAs(page, admin.email, password);
    const adminPages = [
      "/admin",
      "/admin/candidates",
      `/admin/candidates/${candidate.id}`,
      "/admin/questions",
      "/admin/item-groups",
      "/admin/exams",
      "/admin/templates",
      "/admin/features",
      "/admin/scoring",
      "/admin/audit-log",
    ];
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of adminPages) await visit(page, found, problems, vp.name, path);
    }

    console.log(problems.length ? `PROBLEMS (${problems.length}):\n${problems.join("\n")}` : "No problems found.");
    expect(problems).toEqual([]);
  } finally {
    await db.user.delete({ where: { id: candidate.id } }); // cascades attempts, sessions, conversation
    await db.user.delete({ where: { id: admin.id } });
  }
});
