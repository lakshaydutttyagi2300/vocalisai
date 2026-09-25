// Shared fixture for exam-runner-v2 tests (unit + e2e). Builds a tiny
// two-paper exam that is completely isolated from real data:
//  - its questions use a per-run category string ("E2E_V2_<run>"), so the
//    plan's question pools can only ever contain these fixture questions;
//  - the family slug is per-run too (ExamFamily.slug is globally unique);
//  - cleanup() removes every row it created, children first.
//
// Paper 1 "Reading": FREE_WITHIN_SECTION + review, 600s. One PASSAGE group
//   (TFNG + GAP_FILL) and one AUDIO group (MCQ, playLimit 2, fake asset key
//   - never actually fetched from storage by these tests).
// Paper 2 "Speaking": LOCKED_SEQUENTIAL, 300s. SHORT_ANSWER (no correct
//   answer - not auto-marked) + NUMERIC_ENTRY.
import { db } from "@/lib/db";

export interface ExamFixture {
  familyId: string;
  templateId: string;
  categoryReading: string;
  categorySpeaking: string;
  audioGroupId: string;
  questions: { tfng: string; gap: string; mcq: string; shortAnswer: string; numeric: string };
  createSession: (userId: string) => Promise<string>;
  cleanup: () => Promise<void>;
}

export async function createExamFixture(tag: string): Promise<ExamFixture> {
  const run = `${tag}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const categoryReading = `E2E_V2_R_${run}`;
  const categorySpeaking = `E2E_V2_S_${run}`;

  const family = await db.examFamily.create({ data: { slug: `TEST_${run}`, name: `Test family ${run}` } });
  const variant = await db.examVariant.create({
    data: { familyId: family.id, slug: "ACADEMIC", name: "Academic", scoreScale: "IELTS_STYLE_BAND" },
  });
  const reading = await db.examPaper.create({
    data: { variantId: variant.id, order: 1, name: "Reading", durationSeconds: 600, navigationMode: "FREE_WITHIN_SECTION", allowReview: true },
  });
  const speaking = await db.examPaper.create({
    data: { variantId: variant.id, order: 2, name: "Speaking", durationSeconds: 300, navigationMode: "LOCKED_SEQUENTIAL", allowReview: false },
  });
  const readingPart = await db.examPart.create({ data: { paperId: reading.id, order: 1, name: "Passage 1" } });
  const speakingPart = await db.examPart.create({
    data: { paperId: speaking.id, order: 1, name: "Part 1", prepSeconds: 10, responseSeconds: 20 },
  });

  const passage = await db.itemGroup.create({
    data: { type: "PASSAGE", title: "Fixture passage", text: "The library opens at nine. Members may borrow an item for two weeks." },
  });
  const audio = await db.itemGroup.create({
    data: { type: "AUDIO", title: "Fixture audio", assetKey: "item-groups/00000000-0000-4000-8000-000000000000.mp3", transcript: "SECRET TRANSCRIPT", playLimit: 2 },
  });

  const base = { difficulty: "BEGINNER", timeLimitSeconds: 60, source: "SEEDED" };
  const tfng = await db.practiceQuestion.create({
    data: { ...base, category: categoryReading, type: "TRUE_FALSE_NOT_GIVEN", prompt: "The library opens at nine.", correctAnswer: "TRUE", itemGroupId: passage.id, orderInGroup: 1 },
  });
  const gap = await db.practiceQuestion.create({
    data: { ...base, category: categoryReading, type: "GAP_FILL", prompt: "Members may borrow ___ item.", correctAnswer: JSON.stringify([["an"]]), itemGroupId: passage.id, orderInGroup: 2 },
  });
  const mcq = await db.practiceQuestion.create({
    data: { ...base, category: categoryReading, type: "MULTIPLE_CHOICE", prompt: "What did the speaker order?", options: JSON.stringify(["Tea", "Coffee", "Juice"]), correctAnswer: "Coffee", itemGroupId: audio.id, orderInGroup: 1 },
  });
  const shortAnswer = await db.practiceQuestion.create({
    data: { ...base, category: categorySpeaking, type: "SHORT_ANSWER", prompt: "Describe your hometown." },
  });
  const numeric = await db.practiceQuestion.create({
    data: { ...base, category: categorySpeaking, type: "NUMERIC_ENTRY", prompt: "How many days are in a week?", correctAnswer: JSON.stringify({ value: 7 }) },
  });

  const template = await db.mockTestTemplate.create({
    data: {
      name: `Fixture template ${run}`,
      examVariantId: variant.id,
      sections: {
        create: [
          { order: 1, category: categoryReading, difficulty: "BEGINNER", questionCount: 3, examPartId: readingPart.id },
          { order: 2, category: categorySpeaking, difficulty: "BEGINNER", questionCount: 2, examPartId: speakingPart.id },
        ],
      },
    },
  });

  const sessionIds: string[] = [];
  const questionIds = [tfng.id, gap.id, mcq.id, shortAnswer.id, numeric.id];

  return {
    familyId: family.id,
    templateId: template.id,
    categoryReading,
    categorySpeaking,
    audioGroupId: audio.id,
    questions: { tfng: tfng.id, gap: gap.id, mcq: mcq.id, shortAnswer: shortAnswer.id, numeric: numeric.id },
    async createSession(userId: string) {
      const s = await db.mockTestSession.create({ data: { userId, templateId: template.id } });
      sessionIds.push(s.id);
      return s.id;
    },
    async cleanup() {
      // Sessions created through the real API (not createSession) are
      // caught by templateId too.
      await db.mockTestSession.deleteMany({ where: { OR: [{ id: { in: sessionIds } }, { templateId: template.id }] } });
      await db.mockTestTemplate.delete({ where: { id: template.id } });
      await db.practiceQuestion.deleteMany({ where: { id: { in: questionIds } } });
      await db.itemGroup.deleteMany({ where: { id: { in: [passage.id, audio.id] } } });
      await db.examFamily.delete({ where: { id: family.id } });
    },
  };
}
