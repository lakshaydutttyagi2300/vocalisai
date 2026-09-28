import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { setPlan } from "@/lib/entitlements";
import { createTestUser, loginAs } from "./helpers";

// Exam proctoring, end to end with the REAL on-device face detector: only one
// person may be in the camera frame. The test browser has no webcam, so its
// camera is a canvas showing a real photo (one of the homepage's Unsplash
// images): one person, then two people side by side, then one again.
// Checks there's no warning while only the candidate is there, an immediate
// warning plus a logged flag when a second person appears, that it clears
// when they leave, and that the finished exam's results carry the flag.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  permissions: ["camera", "microphone"],
});

const password = "correct-horse-battery-staple";
const SHOTS = "test-results/proctoring";
const PHOTO = "https://images.unsplash.com/photo-1720723652002-dc1f2fb0527b?w=640&q=75&auto=format";
const WARNING = "Multiple people detected. Only the candidate should be visible.";

test("only one person may be in frame: warning, flag and clean-up through a full exam", async ({ page }) => {
  test.setTimeout(300_000);
  const email = `e2e-people-${Date.now()}@example.test`;
  const user = await createTestUser(email, password);
  await setPlan(user.id, "STARTER", { periodDays: 30 });

  // A camera that shows `window.__people` copies of a real photo (0, 1 or 2).
  await page.addInitScript((photo) => {
    const w = window as unknown as { __people: number };
    w.__people = 1;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = photo;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      if (!constraints?.video) return original(constraints);
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const g = canvas.getContext("2d")!;
      const draw = () => {
        g.fillStyle = "#6b7280";
        g.fillRect(0, 0, 640, 480);
        const copies = w.__people;
        if (copies > 0 && img.naturalWidth) {
          const slot = 640 / copies;
          const s = Math.min(slot / img.naturalWidth, 480 / img.naturalHeight);
          for (let k = 0; k < copies; k++) {
            g.drawImage(img, k * slot + (slot - img.naturalWidth * s) / 2, (480 - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
          }
        }
        g.fillStyle = `rgb(${Date.now() % 255},0,0)`; // keeps frames flowing
        g.fillRect(0, 0, 2, 2);
      };
      draw();
      setInterval(draw, 100);
      const stream = canvas.captureStream(10);
      if (constraints.audio) (await original({ audio: true })).getAudioTracks().forEach((t) => stream.addTrack(t));
      return stream;
    };
  }, PHOTO);

  const setPeople = (n: number) => page.evaluate((count) => ((window as unknown as { __people: number }).__people = count), n);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  try {
    await page.goto("/");
    await loginAs(page, email, password);
    await page.goto("/mock-tests");
    await page.getByRole("button", { name: "Begin system check" }).click();
    await page.getByRole("button", { name: "Enable camera" }).click();
    await page.getByRole("button", { name: "Enable microphone" }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const toRules = page.getByRole("button", { name: "Continue to rules" });
    await expect(toRules).toBeEnabled({ timeout: 20_000 });
    await toRules.click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Start test" }).click();
    await expect(page.getByRole("button", { name: "End assessment" })).toBeVisible({ timeout: 30_000 });
    // The exam screen shows a moment before the server has created the session.
    await expect.poll(() => db.mockTestSession.count({ where: { userId: user.id } }), { timeout: 30_000 }).toBe(1);
    const session = await db.mockTestSession.findFirstOrThrow({ where: { userId: user.id }, orderBy: { startedAt: "desc" } });

    // 1. Only the candidate: the check runs and says so - and no warning, ever.
    await expect(page.getByText("Only you are visible.")).toBeVisible({ timeout: 60_000 });
    for (let i = 0; i < 10; i++) {
      await expect(page.getByText(WARNING)).toHaveCount(0);
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: `${SHOTS}/1-one-person.png` });

    // 2. A second person appears: an immediate, clear warning.
    await setPeople(2);
    const alert = page.getByRole("alert").filter({ hasText: WARNING });
    await expect(alert).toBeVisible({ timeout: 8_000 });
    await expect(alert).toContainText("2 people are in view of your camera");
    await expect(page.getByText("2 people detected.")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/2-two-people.png` });
    // ...flagged and logged on the server, once for the whole episode.
    await expect.poll(() => db.proctoringEvent.count({ where: { sessionId: session.id, eventType: "MULTIPLE_FACES" } }), { timeout: 20_000 }).toBe(1);
    await page.waitForTimeout(3000);
    expect(await db.proctoringEvent.count({ where: { sessionId: session.id, eventType: "MULTIPLE_FACES" } })).toBe(1);

    // 3. They leave: the warning clears and that's logged too.
    await setPeople(1);
    await expect(alert).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText("Only you are visible.")).toBeVisible();
    await expect(page.getByText("Only the candidate visible again")).toBeVisible();
    await expect.poll(() => db.proctoringEvent.count({ where: { sessionId: session.id, eventType: "MULTIPLE_FACES_CLEARED" } }), { timeout: 20_000 }).toBe(1);
    await page.screenshot({ path: `${SHOTS}/3-back-to-one.png` });

    // 4. Carry on with the exam: answer a question, then finish.
    await page.getByRole("button", { name: "Start section" }).click();
    const card = page.locator("div.rounded-lg.bg-white").first();
    await expect(card.getByRole("heading", { level: 3 })).toBeVisible({ timeout: 30_000 });
    const next = card.getByRole("button", { name: /Submit & (next|finish)/ });
    if (await next.count()) {
      await card.locator("div.space-y-2 button").first().click();
      await next.click();
    }
    await page.getByRole("button", { name: "End assessment" }).click();
    await expect(page).toHaveURL(new RegExp(`/mock-tests/results/${session.id}`), { timeout: 60_000 });

    // 5. The results carry the flag.
    await expect(page.getByText("Proctoring events")).toBeVisible({ timeout: 30_000 });
    const flagged = await db.proctoringEvent.findMany({ where: { sessionId: session.id }, select: { eventType: true, detail: true } });
    expect(flagged).toEqual(expect.arrayContaining([{ eventType: "MULTIPLE_FACES", detail: "2 people in view" }]));
    expect(flagged.some((e) => e.eventType === "FACE_NOT_DETECTED")).toBe(false); // the candidate was always visible
    await page.screenshot({ path: `${SHOTS}/4-results.png`, fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await db.user.delete({ where: { id: user.id } }); // cascades the session and its events
  }
});
