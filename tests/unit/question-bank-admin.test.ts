import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { deleteQuestions, findDuplicates } from "@/lib/question-bank-admin";
import { buildReviewWorkbook } from "@/lib/question-review-export";

// Duplicate detection, bulk delete (used questions are archived, not
// deleted) and the review workbook, on throwaway questions.
const run = Date.now();
const tag = `qbank-${run}`;
let userId = "";
const ids: Record<string, string> = {};

async function question(key: string, prompt: string, extra: { passage?: string; createdAt?: Date } = {}) {
  const q = await db.practiceQuestion.create({
    data: { category: "VOCABULARY", difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", prompt, options: JSON.stringify(["a", "b"]), correctAnswer: "a", timeLimitSeconds: 45, tags: [tag], ...extra },
  });
  ids[key] = q.id;
}

beforeAll(async () => {
  const text = `Choose the synonym of BRAVE ${tag}`;
  await question("original", text, { createdAt: new Date("2026-01-01") });
  await question("copySpacing", `  choose the   synonym of brave ${tag} `, { createdAt: new Date("2026-02-01") });
  await question("copyUsed", text.toUpperCase(), { createdAt: new Date("2026-03-01") });
  await question("otherPassage", text, { passage: `A different passage ${tag}` });
  await question("unique", `A question nobody else has ${tag}`);
  const user = await db.user.create({ data: { email: `${tag}@example.test`, passwordHash: "x", name: "Bank Test" } });
  userId = user.id;
  await db.practiceAttempt.create({ data: { userId, questionId: ids.copyUsed, category: "VOCABULARY", difficulty: "BEGINNER", timeTakenSeconds: 5 } });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: userId } });
  await db.practiceQuestion.deleteMany({ where: { tags: { has: tag } } });
});

describe("question bank admin", () => {
  it("finds questions with the same text, ignoring case and spacing, but not under a different passage", async () => {
    const d = await findDuplicates();
    const group = d.group.get(ids.original);
    expect(group).toBeDefined();
    expect(d.group.get(ids.copySpacing)).toBe(group);
    expect(d.group.get(ids.copyUsed)).toBe(group);
    expect([d.copy.get(ids.original), d.copy.get(ids.copySpacing), d.copy.get(ids.copyUsed)]).toEqual([1, 2, 3]);
    expect(d.group.has(ids.otherPassage)).toBe(false);
    expect(d.group.has(ids.unique)).toBe(false);
  });

  it("builds a review workbook: summary, possible duplicates and a sheet per category", async () => {
    const wb = XLSX.read(await buildReviewWorkbook({ search: tag }), { type: "buffer" });
    expect(wb.SheetNames).toEqual(["Summary", "Possible duplicates", "Vocabulary"]);
    const dupes = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Possible duplicates"]);
    expect(dupes.map((r) => r.ID)).toEqual([ids.original, ids.copySpacing, ids.copyUsed]);
    expect(dupes.map((r) => r["Copy (1 = oldest)"])).toEqual([1, 2, 3]);
    const vocab = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Vocabulary);
    expect(vocab).toHaveLength(5);
    expect(vocab.find((r) => r.ID === ids.copyUsed)?.["Times answered"]).toBe(1);
    expect(vocab.find((r) => r.ID === ids.unique)?.Options).toBe("a | b");
  });

  it("deletes unused questions and archives ones candidates have answered", async () => {
    expect(await deleteQuestions([ids.copySpacing, ids.copyUsed, ids.copySpacing])).toEqual({ deleted: 1, archived: 1 });
    expect(await db.practiceQuestion.findUnique({ where: { id: ids.copySpacing } })).toBeNull();
    const used = await db.practiceQuestion.findUniqueOrThrow({ where: { id: ids.copyUsed } });
    expect(used.isActive).toBe(false);
    expect(used.archivedAt).not.toBeNull();
    // Archived questions no longer count as duplicates.
    expect((await findDuplicates()).group.has(ids.original)).toBe(false);
  });
});
