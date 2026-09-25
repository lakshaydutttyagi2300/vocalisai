// Shared e2e setup for exam runner v2: makes the fixture template the
// default (so the REAL /api/mock-tests/sessions route picks it) and sets
// the exam_runner_v2 flag - then puts both back exactly as they were.
// Safe only because e2e runs with workers: 1 (playwright.config.ts).
import { db } from "@/lib/db";
import { createExamFixture, type ExamFixture } from "../helpers/exam-fixture";

export interface ExamV2Env {
  fixture: ExamFixture;
  setFlag: (enabled: boolean) => Promise<void>;
  restore: () => Promise<void>;
}

export async function setUpExamV2Env(tag: string): Promise<ExamV2Env> {
  const fixture = await createExamFixture(tag);

  const previousDefaults = await db.mockTestTemplate.findMany({ where: { isDefault: true }, select: { id: true } });
  await db.mockTestTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  await db.mockTestTemplate.update({ where: { id: fixture.templateId }, data: { isDefault: true } });

  const previousFlag = await db.featureFlag.findUnique({ where: { key: "exam_runner_v2" } });

  return {
    fixture,
    async setFlag(enabled: boolean) {
      await db.featureFlag.upsert({
        where: { key: "exam_runner_v2" },
        create: { key: "exam_runner_v2", label: "Exam Runner v2", enabled },
        update: { enabled },
      });
    },
    async restore() {
      if (previousFlag) {
        await db.featureFlag.update({ where: { key: "exam_runner_v2" }, data: { enabled: previousFlag.enabled } });
      } else {
        await db.featureFlag.deleteMany({ where: { key: "exam_runner_v2" } });
      }
      await db.mockTestTemplate.update({ where: { id: fixture.templateId }, data: { isDefault: false } });
      if (previousDefaults.length > 0) {
        await db.mockTestTemplate.updateMany({ where: { id: { in: previousDefaults.map((t) => t.id) } }, data: { isDefault: true } });
      }
      await fixture.cleanup();
    },
  };
}
