import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { createTestUser, loginAs } from "./helpers";

// Real-server checks for the admin item-group asset routes (P1-D) that
// have NO bucket side effects: auth gating, validation rejection, and
// minting a presigned URL (local signing - nothing is uploaded). The
// actual upload/complete/oversized-delete paths are covered in
// tests/unit/item-group-assets.test.ts against a mocked storage layer,
// because the dev .env's R2 credentials point at a real bucket this suite
// must never write test files into.
const runId = Date.now();
const password = "correct-horse-battery-staple";

test("a candidate (non-admin) is forbidden from requesting an asset upload URL", async ({ page }, testInfo) => {
  const email = `e2e-assets-candidate-${runId}-${testInfo.testId}@example.test`;
  await createTestUser(email, password);
  await page.goto("/");
  await loginAs(page, email, password);

  const res = await page.request.post("/api/admin/item-groups/assets/presign", {
    data: { type: "AUDIO", mimeType: "audio/mpeg", sizeBytes: 1000 },
  });
  expect(res.status()).toBe(403);
});

test("an admin is rejected for a disallowed file type, and gets a presign response for a valid one", async ({ page }, testInfo) => {
  const email = `e2e-assets-admin-${runId}-${testInfo.testId}@example.test`;
  const user = await createTestUser(email, password);
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await page.goto("/");
  await loginAs(page, email, password);

  const bad = await page.request.post("/api/admin/item-groups/assets/presign", {
    data: { type: "AUDIO", mimeType: "application/pdf", sizeBytes: 1000 },
  });
  expect(bad.status()).toBe(400);

  const good = await page.request.post("/api/admin/item-groups/assets/presign", {
    data: { type: "AUDIO", mimeType: "audio/mpeg", sizeBytes: 1000 },
  });
  expect(good.ok()).toBe(true);
  const body = await good.json();
  // Either mode is valid depending on whether R2 is configured where this
  // runs; both must be well-formed.
  if (body.mode === "direct") {
    expect(body.key).toMatch(/^item-groups\/[0-9a-f-]{36}\.mp3$/);
    expect(typeof body.uploadUrl).toBe("string");
  } else {
    expect(body).toEqual({ mode: "server" });
  }
});
