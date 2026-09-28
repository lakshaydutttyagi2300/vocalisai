// Which mock exams a candidate may choose between on the Mock Exams page.
//
// Always: the admin's default template, exactly as before - a candidate
// who never picks anything gets today's behaviour - and the mock exams that
// belong to an enabled Goal Track (ExamBlueprint kind "mock").
// Only while the exam_runner_v2 flag is on: every template linked to an
// ACTIVE exam version of an ACTIVE exam family - the exam library. Admins
// add exam types, timed papers and sections in /admin/exams and
// /admin/templates; nothing here is hard-coded per exam.
//
// No duplicate cards: exams of the same type with the same papers, timings
// and sections are ONE option with several versions (e.g. "Practice Test
// 1/2/3"); starting it gives the candidate a version they haven't taken
// (pickVersion). A card's title drops the version number.

import { db } from "@/lib/db";
import { isExamRunnerV2Enabled } from "@/lib/exam-runner";
import { DIFFICULTY_LABELS, getModeByCategory } from "@/lib/practice-taxonomy";

export interface MockTestOption {
  /** The version the card starts by default (the first one). */
  templateId: string;
  /** Every version behind this card (1 or more); the first is templateId. */
  versionTemplateIds: string[];
  name: string;
  kind: "standard" | "exam";
  isDefault: boolean;
  examName: string | null; // e.g. "Business English · Workplace Essentials (B1)"
  /** Filter group: an exam family's slug, or "ASSESSMENTS" for standard tests. */
  typeKey: string;
  typeName: string;
  description: string | null;
  totalMinutes: number | null; // exam kind: the sum of its timed papers
  papers: { name: string; minutes: number }[];
  questionCount: number;
  levels: string[]; // e.g. ["Intermediate"] or ["Beginner", "Expert"]
  skills: string[]; // e.g. ["Grammar", "Listening"]
  /** The Goal Track this test belongs to (standard tests only), e.g. "BPO / Customer Support". */
  trackName?: string | null;
}

interface SectionShape {
  category: string;
  difficulty: string;
  questionCount: number;
  examPartId?: string | null;
  examPart?: { order: number; paper: { order: number } } | null;
}

const DIFFICULTY_ORDER = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];

function summarise(sections: SectionShape[]) {
  const levels = DIFFICULTY_ORDER.filter((d) => sections.some((s) => s.difficulty === d)).map((d) => DIFFICULTY_LABELS[d as keyof typeof DIFFICULTY_LABELS] ?? d);
  const skills = [...new Set(sections.map((s) => getModeByCategory(s.category)?.label ?? s.category))];
  return { questionCount: sections.reduce((n, s) => n + s.questionCount, 0), levels, skills };
}

/** Same papers (names, timings, navigation) and same sections per part = versions of one exam. */
export function structureKey(
  familyId: string,
  papers: { name: string; durationSeconds: number; navigationMode: string }[],
  sections: SectionShape[]
): string {
  const p = papers.map((x) => `${x.name.trim().toLowerCase()}:${x.durationSeconds}:${x.navigationMode}`).join("|");
  const s = sections
    .map((x) => `${x.examPart?.paper.order ?? "-"}.${x.examPart?.order ?? "-"}:${x.category}:${x.difficulty}:${x.questionCount}`)
    .sort()
    .join("|");
  return `${familyId}#${p}#${s}`;
}

/** "IELTS-style Academic - Practice Test 1" + "... 2" -> "IELTS-style Academic". */
export function versionTitle(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  let prefix = names[0];
  for (const n of names.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < n.length && prefix[i].toLowerCase() === n[i].toLowerCase()) i++;
    prefix = prefix.slice(0, i);
  }
  const cleaned = prefix
    .replace(/[\s\-–—:·#(]*(practice\s+test|test|version|set|form|paper|mock)?\s*\d*$/i, "")
    .replace(/[\s\-–—:·#(]+$/, "")
    .trim();
  return cleaned.length >= 3 ? cleaned : names[0];
}

async function defaultTemplate() {
  return (
    (await db.mockTestTemplate.findFirst({ where: { isDefault: true }, select: { id: true } })) ??
    (await db.mockTestTemplate.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }))
  );
}

async function standardOptions(): Promise<MockTestOption[]> {
  const def = await defaultTemplate();
  const trackExams = await db.examBlueprint.findMany({
    where: { kind: "mock", enabled: true, mockTestTemplateId: { not: null }, goalTrack: { enabled: true } },
    orderBy: { goalTrack: { sortOrder: "asc" } },
    select: { mockTestTemplateId: true, goalTrack: { select: { name: true } } },
  });
  const ids = [...new Set([def?.id, ...trackExams.map((b) => b.mockTestTemplateId)].filter((x): x is string => !!x))];
  const templates = await db.mockTestTemplate.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, sections: { orderBy: { order: "asc" }, select: { category: true, difficulty: true, questionCount: true } } },
  });
  const byId = new Map(templates.map((t) => [t.id, t]));

  const options: MockTestOption[] = [];
  for (const id of ids) {
    const t = byId.get(id);
    if (!t) continue;
    const blueprint = trackExams.find((b) => b.mockTestTemplateId === id);
    const sum = summarise(t.sections);
    options.push({
      templateId: t.id,
      versionTemplateIds: [t.id],
      name: t.name,
      kind: "standard",
      isDefault: t.id === def?.id,
      examName: null,
      typeKey: "ASSESSMENTS",
      typeName: "Assessments",
      // Blueprint descriptions are internal notes - candidates get a summary of what the test covers.
      description: `A proctored assessment: ${sum.skills.slice(0, 5).join(", ").toLowerCase()}${sum.skills.length > 5 ? " and more" : ""}.`,
      totalMinutes: null,
      papers: [],
      ...sum,
      trackName: blueprint?.goalTrack?.name ?? null,
    });
  }
  return options;
}

async function examOptions(exclude: string[]): Promise<MockTestOption[]> {
  const templates = await db.mockTestTemplate.findMany({
    where: {
      id: { notIn: exclude },
      examVariant: { isActive: true, family: { isActive: true } },
      sections: { some: { examPartId: { not: null } } },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sections: {
        orderBy: { order: "asc" },
        select: { category: true, difficulty: true, questionCount: true, examPartId: true, examPart: { select: { order: true, paper: { select: { order: true } } } } },
      },
      examVariant: {
        select: {
          name: true,
          description: true,
          family: { select: { id: true, slug: true, name: true, description: true } },
          papers: { orderBy: { order: "asc" }, select: { name: true, durationSeconds: true, navigationMode: true } },
        },
      },
    },
  });

  const groups = new Map<string, typeof templates>();
  for (const t of templates) {
    const v = t.examVariant;
    if (!v) continue;
    const key = structureKey(v.family.id, v.papers, t.sections);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  const options: MockTestOption[] = [];
  for (const group of groups.values()) {
    const first = group[0];
    const v = first.examVariant!;
    const papers = v.papers.map((p) => ({ name: p.name, minutes: Math.round(p.durationSeconds / 60) }));
    const variantNames = [...new Set(group.map((t) => t.examVariant!.name))];
    options.push({
      templateId: first.id,
      versionTemplateIds: group.map((t) => t.id),
      name: versionTitle(group.map((t) => t.name)),
      kind: "exam",
      isDefault: false,
      examName: `${v.family.name} · ${versionTitle(variantNames)}`,
      typeKey: v.family.slug,
      typeName: v.family.name,
      description: group.map((t) => t.examVariant!.description).find(Boolean) ?? v.family.description ?? null,
      totalMinutes: papers.reduce((n, p) => n + p.minutes, 0),
      papers,
      ...summarise(first.sections),
    });
  }
  // Grouped by type, shortest first within a type.
  return options.sort((a, b) => a.typeName.localeCompare(b.typeName) || (a.totalMinutes ?? 0) - (b.totalMinutes ?? 0) || a.name.localeCompare(b.name));
}

export async function listMockTestOptions(): Promise<MockTestOption[]> {
  const standard = await standardOptions();
  if (!(await isExamRunnerV2Enabled())) return standard;
  return [...standard, ...(await examOptions(standard.map((o) => o.templateId)))];
}

/** The option a template belongs to (as the card's own id or one of its versions), if offered. */
export function findOption(options: MockTestOption[], templateId: string): MockTestOption | null {
  return options.find((o) => o.versionTemplateIds.includes(templateId)) ?? null;
}

/**
 * Which version of a multi-version exam to start for this candidate: one
 * they have never started, else the one started longest ago.
 */
export async function pickVersion(userId: string, versionTemplateIds: string[]): Promise<string> {
  if (versionTemplateIds.length <= 1) return versionTemplateIds[0];
  const taken = await db.mockTestSession.groupBy({
    by: ["templateId"],
    where: { userId, templateId: { in: versionTemplateIds } },
    _max: { startedAt: true },
  });
  const last = new Map(taken.map((t) => [t.templateId, t._max.startedAt?.getTime() ?? 0]));
  const fresh = versionTemplateIds.find((id) => !last.has(id));
  if (fresh) return fresh;
  return [...versionTemplateIds].sort((a, b) => (last.get(a) ?? 0) - (last.get(b) ?? 0))[0];
}
