// Which mock tests a candidate may choose between on the Mock Tests page.
//
// Always: the admin's default template, exactly as before - a candidate
// who never picks anything gets today's behaviour.
// Additionally, only while the exam_runner_v2 flag is on: every template
// linked to an ACTIVE exam version of an ACTIVE exam family (e.g. the
// IELTS-style practice tests). Admins hide one by deactivating its version
// or family on /admin/exams. No schema change - this reads existing
// columns only.

import { db } from "@/lib/db";
import { isExamRunnerV2Enabled } from "@/lib/exam-runner";

export interface MockTestOption {
  templateId: string;
  name: string;
  kind: "standard" | "exam";
  isDefault: boolean;
  examName: string | null; // e.g. "IELTS-style · Academic - Practice Test 1"
  totalMinutes: number | null; // exam kind only: the sum of its timed papers
  papers: { name: string; minutes: number }[];
}

async function defaultTemplate() {
  return (
    (await db.mockTestTemplate.findFirst({ where: { isDefault: true }, select: { id: true, name: true } })) ??
    (await db.mockTestTemplate.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, name: true } }))
  );
}

export async function listMockTestOptions(): Promise<MockTestOption[]> {
  const options: MockTestOption[] = [];
  const def = await defaultTemplate();
  if (def) options.push({ templateId: def.id, name: def.name, kind: "standard", isDefault: true, examName: null, totalMinutes: null, papers: [] });

  if (!(await isExamRunnerV2Enabled())) return options;

  const examTemplates = await db.mockTestTemplate.findMany({
    where: {
      id: def ? { not: def.id } : undefined,
      examVariant: { isActive: true, family: { isActive: true } },
      sections: { some: { examPartId: { not: null } } },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      examVariant: {
        select: {
          name: true,
          family: { select: { name: true } },
          papers: { orderBy: { order: "asc" }, select: { name: true, durationSeconds: true } },
        },
      },
    },
  });

  for (const t of examTemplates) {
    const papers = (t.examVariant?.papers ?? []).map((p) => ({ name: p.name, minutes: Math.round(p.durationSeconds / 60) }));
    options.push({
      templateId: t.id,
      name: t.name,
      kind: "exam",
      isDefault: false,
      examName: t.examVariant ? `${t.examVariant.family.name} · ${t.examVariant.name}` : null,
      totalMinutes: papers.reduce((n, p) => n + p.minutes, 0),
      papers,
    });
  }
  return options;
}
