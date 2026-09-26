// P1-E: server side of exam runner v2. Everything time-related is decided
// here, from stored deadlines - the client only displays countdowns. Every
// route calls loadSessionState(), which first runs processExpiry(), so an
// expired paper is auto-submitted the moment the session is touched again
// (even if the candidate closed the tab), and the clock keeps running
// while they're away, the same as a real timed exam.
//
// Grading uses the P1-C question-type registry's pure graders only - no
// AI, no invented numbers. Nothing here touches PracticeAttempt, usage
// counting, or the existing mock-test scoring engine.

import { lastSeenByUser } from "@/lib/question-freshness";
import { db } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getQuestionTypeDef, type GradeResult } from "@/lib/question-types";
import { isValidNavigationMode, type NavigationMode } from "@/lib/exam-catalogue";
import { candidateStimulus, type Stimulus } from "@/lib/question-stimulus";

export const EXAM_RUNNER_V2_FLAG = "exam_runner_v2";

// How long past a deadline a write is still accepted - absorbs network
// latency for an answer typed in the final second. Small on purpose.
export const DEADLINE_GRACE_MS = 5_000;

export interface PlanPart {
  partId: string;
  name: string;
  instructions: string | null;
  prepSeconds: number | null;
  responseSeconds: number | null;
}

export interface PlanQuestion {
  questionId: string;
  partId: string;
}

export interface PlanPaper {
  paperId: string;
  name: string;
  durationSeconds: number;
  navigationMode: NavigationMode;
  allowReview: boolean;
  instructions: string | null;
  parts: PlanPart[];
  questions: PlanQuestion[];
}

export interface ExamPlan {
  papers: PlanPaper[];
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested directly)
// ---------------------------------------------------------------------------

export function paperDeadline(paperStart: Date, durationSeconds: number, examDeadline: Date): Date {
  return new Date(Math.min(paperStart.getTime() + durationSeconds * 1000, examDeadline.getTime()));
}

export function isPastDeadline(now: Date, deadline: Date, graceMs = DEADLINE_GRACE_MS): boolean {
  return now.getTime() > deadline.getTime() + graceMs;
}

// Deterministic shuffle (mulberry32 seeded from a string) - the same
// session sees the same option order after every refresh, and different
// sessions see different orders. Used for display order only; grading
// never depends on position (see question-types graders).
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface PoolQuestion {
  id: string;
  itemGroupId: string | null;
  orderInGroup: number | null;
}

// Picks ~count questions for one section, keeping shared-stimulus groups
// (P1-B) whole - a reading passage never shows up with only some of its
// questions. A group that would overshoot the count is skipped in favour
// of smaller units; if nothing fits at all, the first unit is taken
// anyway so a section is never silently empty.
export function selectQuestionUnits(
  pool: PoolQuestion[],
  count: number,
  seed: string,
  exclude: Set<string>,
  lastSeen?: Map<string, Date>
): string[] {
  const available = pool.filter((q) => !exclude.has(q.id));
  const groups = new Map<string, PoolQuestion[]>();
  const singles: PoolQuestion[][] = [];
  for (const q of available) {
    if (q.itemGroupId) {
      const g = groups.get(q.itemGroupId) ?? [];
      g.push(q);
      groups.set(q.itemGroupId, g);
    } else {
      singles.push([q]);
    }
  }
  const units = [
    ...[...groups.values()].map((g) => [...g].sort((a, b) => (a.orderInGroup ?? 0) - (b.orderInGroup ?? 0))),
    ...singles,
  ];
  let shuffled = seededShuffle(units, seed);
  // Fresh first (when the candidate's history is known): units with no
  // question they've met before come first, then the least-recently-seen.
  if (lastSeen && lastSeen.size > 0) {
    const seenAt = (unit: PoolQuestion[]) => Math.max(0, ...unit.map((q) => lastSeen.get(q.id)?.getTime() ?? 0));
    shuffled = shuffled.map((u, i) => ({ u, i, t: seenAt(u) })).sort((a, b) => a.t - b.t || a.i - b.i).map((x) => x.u);
  }

  const picked: string[] = [];
  for (const unit of shuffled) {
    if (picked.length >= count) break;
    if (picked.length + unit.length <= count) picked.push(...unit.map((q) => q.id));
  }
  if (picked.length === 0 && shuffled.length > 0) picked.push(...shuffled[0].map((q) => q.id));
  return picked;
}

// Unanswered or malformed answers never get a fabricated score: an
// auto-gradable type scores 0 (the candidate genuinely didn't answer), a
// non-auto-gradable one (writing/speaking) stays null.
export function gradeItem(type: string, answerJson: string | null, correctAnswer: string | null): GradeResult {
  const def = getQuestionTypeDef(type);
  if (!def) return { isCorrect: null, score: null };

  let parsed: unknown = undefined;
  if (answerJson !== null) {
    try {
      parsed = JSON.parse(answerJson);
    } catch {
      parsed = undefined;
    }
  }
  const valid = parsed !== undefined ? def.answerSchema.safeParse(parsed) : null;
  if (valid?.success) return def.grade(valid.data, correctAnswer);
  return def.autoGradable ? { isCorrect: false, score: 0 } : { isCorrect: null, score: null };
}

// ---------------------------------------------------------------------------
// DB-backed operations
// ---------------------------------------------------------------------------

export async function isExamRunnerV2Enabled(): Promise<boolean> {
  return isFeatureEnabled(EXAM_RUNNER_V2_FLAG);
}

// Decides which runner a freshly created mock-test session should use.
// Both conditions are required, so every existing template (no variant
// linked) keeps today's runner whether or not the flag is on.
export async function runnerForTemplate(template: { examVariantId: string | null } | null): Promise<"v1" | "v2"> {
  if (!template?.examVariantId) return "v1";
  return (await isExamRunnerV2Enabled()) ? "v2" : "v1";
}

export async function buildPlan(templateId: string, seed: string, lastSeen?: Map<string, Date>): Promise<ExamPlan> {
  const sections = await db.mockTestTemplateSection.findMany({
    where: { templateId, examPartId: { not: null } },
    include: { examPart: { include: { paper: true } } },
  });

  // Group sections by paper, then by part, both in their configured order.
  const papers = new Map<string, PlanPaper & { order: number }>();
  const sorted = [...sections].sort(
    (a, b) =>
      a.examPart!.paper.order - b.examPart!.paper.order || a.examPart!.order - b.examPart!.order || a.order - b.order
  );

  const used = new Set<string>();
  for (const section of sorted) {
    const part = section.examPart!;
    const paper = part.paper;
    let planPaper = papers.get(paper.id);
    if (!planPaper) {
      planPaper = {
        order: paper.order,
        paperId: paper.id,
        name: paper.name,
        durationSeconds: paper.durationSeconds,
        navigationMode: isValidNavigationMode(paper.navigationMode) ? paper.navigationMode : "LOCKED_SEQUENTIAL",
        allowReview: paper.allowReview,
        instructions: paper.instructions,
        parts: [],
        questions: [],
      };
      papers.set(paper.id, planPaper);
    }
    if (!planPaper.parts.some((p) => p.partId === part.id)) {
      planPaper.parts.push({
        partId: part.id,
        name: part.name,
        instructions: part.instructions,
        prepSeconds: part.prepSeconds,
        responseSeconds: part.responseSeconds,
      });
    }

    // Questions pinned to this exact part (P1-H) win outright; otherwise
    // the section's category/difficulty pool, minus anything pinned to
    // some other part (a pinned passage never leaks into another exam).
    const select = { id: true, itemGroupId: true, orderInGroup: true } as const;
    const pinned = await db.practiceQuestion.findMany({ where: { examPartId: part.id, isActive: true }, select });
    const pool =
      pinned.length > 0
        ? pinned
        : await db.practiceQuestion.findMany({
            where: { category: section.category, difficulty: section.difficulty, isActive: true, examPartId: null },
            select,
          });
    const ids = selectQuestionUnits(pool, section.questionCount, `${seed}:${section.id}`, used, lastSeen);
    for (const id of ids) {
      used.add(id);
      planPaper.questions.push({ questionId: id, partId: part.id });
    }
  }

  return {
    papers: [...papers.values()]
      .sort((a, b) => a.order - b.order)
      .map(({ order: _order, ...p }) => {
        void _order;
        return p;
      })
      .filter((p) => p.questions.length > 0),
  };
}

export function parsePlan(planJson: string): ExamPlan {
  return JSON.parse(planJson) as ExamPlan;
}

type StateRow = NonNullable<Awaited<ReturnType<typeof db.examSessionState.findUnique>>>;

// Grades every question in one paper and writes the result onto its
// ItemResponse (creating one for anything never answered, so totals are
// complete). Idempotent - safe to run twice for the same paper.
async function gradePaper(mockTestSessionId: string, plan: ExamPlan, paperIndex: number): Promise<void> {
  const paper = plan.papers[paperIndex];
  if (!paper) return;
  const questionIds = paper.questions.map((q) => q.questionId);
  const [questions, responses] = await Promise.all([
    db.practiceQuestion.findMany({ where: { id: { in: questionIds } }, select: { id: true, type: true, correctAnswer: true } }),
    db.itemResponse.findMany({ where: { mockTestSessionId, questionId: { in: questionIds } } }),
  ]);
  const byQuestion = new Map(responses.map((r) => [r.questionId, r]));

  // A fixed handful of queries regardless of paper size (one createMany
  // for never-answered questions, one updateMany per distinct result -
  // at most three: correct, incorrect, not auto-marked), instead of one
  // round-trip per question. createMany's skipDuplicates also makes two
  // concurrent submits of the same paper harmless.
  const missing: { questionId: string; isCorrect: boolean | null; score: number | null }[] = [];
  const updatesByResult = new Map<string, { result: GradeResult; ids: string[] }>();
  for (const q of questions) {
    const existing = byQuestion.get(q.id);
    const result = gradeItem(q.type, existing?.answerJson ?? null, q.correctAnswer);
    if (!existing) {
      missing.push({ questionId: q.id, ...result });
      continue;
    }
    const key = `${result.isCorrect}:${result.score}`;
    const bucket = updatesByResult.get(key) ?? { result, ids: [] };
    bucket.ids.push(existing.id);
    updatesByResult.set(key, bucket);
  }

  if (missing.length > 0) {
    await db.itemResponse.createMany({
      data: missing.map((m) => ({ mockTestSessionId, paperIndex, ...m })),
      skipDuplicates: true,
    });
  }
  for (const { result, ids } of updatesByResult.values()) {
    await db.itemResponse.updateMany({ where: { id: { in: ids } }, data: { isCorrect: result.isCorrect, score: result.score } });
  }
}

// Locks the current paper and moves to the next one. `nextStart` is when
// the next paper's clock begins - now for a manual submit, or the old
// deadline for an auto-submit (time kept running while they were away).
// The conditional updateMany makes a double-submit race harmless: only
// the first caller advances.
async function submitAndAdvance(state: StateRow, plan: ExamPlan, nextStart: Date): Promise<void> {
  await gradePaper(state.mockTestSessionId, plan, state.currentPaperIndex);

  const nextIndex = state.currentPaperIndex + 1;
  const isLast = nextIndex >= plan.papers.length;

  if (isLast) {
    const now = new Date();
    const updated = await db.examSessionState.updateMany({
      where: { id: state.id, currentPaperIndex: state.currentPaperIndex, status: "IN_PROGRESS" },
      data: { status: "COMPLETED", completedAt: now, currentPaperIndex: nextIndex, currentQuestionIndex: 0 },
    });
    if (updated.count > 0) {
      await db.mockTestSession.updateMany({ where: { id: state.mockTestSessionId, endedAt: null }, data: { endedAt: now } });
    }
    return;
  }

  const next = plan.papers[nextIndex];
  await db.examSessionState.updateMany({
    where: { id: state.id, currentPaperIndex: state.currentPaperIndex, status: "IN_PROGRESS" },
    data: {
      currentPaperIndex: nextIndex,
      currentQuestionIndex: 0,
      paperStartedAt: nextStart,
      paperDeadline: paperDeadline(nextStart, next.durationSeconds, state.examDeadline),
    },
  });
}

// Auto-submits every paper whose deadline has passed, looping in case the
// candidate was away through several. Also finalizes a session the
// candidate ended via the existing "End assessment" button (which only
// sets MockTestSession.endedAt).
export async function processExpiry(mockTestSessionId: string, now = new Date()): Promise<StateRow | null> {
  for (let guard = 0; guard < 50; guard++) {
    const state = await db.examSessionState.findUnique({ where: { mockTestSessionId } });
    if (!state || state.status !== "IN_PROGRESS") return state;
    const plan = parsePlan(state.planJson);

    const session = await db.mockTestSession.findUnique({ where: { id: mockTestSessionId }, select: { endedAt: true } });
    if (session?.endedAt) {
      await submitAndAdvance(state, plan, now);
      continue;
    }
    if (!isPastDeadline(now, state.paperDeadline)) return state;
    await submitAndAdvance(state, plan, state.paperDeadline);
  }
  return db.examSessionState.findUnique({ where: { mockTestSessionId } });
}

// `expectedPaperIndex` is the paper the caller believes is current. It's
// re-checked against FRESH state, so two near-simultaneous submits for
// paper 0 can't turn into "submit paper 0, then submit paper 1": the
// second one sees the server already moved on and does nothing. (If both
// read paper 0 at the same instant, submitAndAdvance's conditional update
// still lets only one advance.)
export async function submitCurrentPaper(mockTestSessionId: string, expectedPaperIndex: number): Promise<void> {
  const state = await processExpiry(mockTestSessionId);
  if (!state || state.status !== "IN_PROGRESS" || state.currentPaperIndex !== expectedPaperIndex) return;
  await submitAndAdvance(state, parsePlan(state.planJson), new Date());
}

// Ownership + flag check shared by every /api/exam-sessions route.
export async function loadOwnedSession(sessionId: string, userId: string) {
  const session = await db.mockTestSession.findUnique({ where: { id: sessionId }, include: { template: true } });
  if (!session || session.userId !== userId) return null;
  return session;
}

export async function startOrResume(sessionId: string): Promise<{ error: string | null }> {
  const existing = await db.examSessionState.findUnique({ where: { mockTestSessionId: sessionId } });
  if (existing) return { error: null };

  const session = await db.mockTestSession.findUnique({ where: { id: sessionId }, include: { template: true } });
  if (!session?.template?.examVariantId) return { error: "This assessment isn't set up for the new exam runner." };
  if (session.endedAt) return { error: "This assessment has already ended." };

  const plan = await buildPlan(session.template.id, sessionId, await lastSeenByUser(session.userId));
  if (plan.papers.length === 0) return { error: "No questions are available for this exam yet. Ask an admin to check its setup." };

  const now = new Date();
  const totalSeconds = plan.papers.reduce((s, p) => s + p.durationSeconds, 0);
  const examDeadline = new Date(now.getTime() + totalSeconds * 1000);

  try {
    await db.examSessionState.create({
      data: {
        mockTestSessionId: sessionId,
        planJson: JSON.stringify(plan),
        examStartedAt: now,
        examDeadline,
        paperStartedAt: now,
        paperDeadline: paperDeadline(now, plan.papers[0].durationSeconds, examDeadline),
      },
    });
  } catch {
    // Unique constraint on mockTestSessionId - a concurrent start (e.g.
    // React dev-mode double-mount) already created it. Resume that one.
  }
  return { error: null };
}

export interface ItemGroupView {
  id: string;
  type: string;
  title: string | null;
  text: string | null;
  hasAsset: boolean;
  playLimit: number | null;
  playsUsed: number;
}

export interface QuestionView {
  id: string;
  type: string;
  prompt: string;
  passage: string | null;
  options: string[] | null;
  partId: string;
  itemGroup: ItemGroupView | null;
  // Audio/picture stimulus parsed from the question's own passage (only when it
  // has no item group) - see question-stimulus.ts. Never the raw spec.
  stimulus: Extract<Stimulus, { kind: "audio" } | { kind: "image" }> | null;
}

export interface ExamStateView {
  status: "IN_PROGRESS" | "COMPLETED";
  serverNow: string;
  examDeadline: string;
  paperDeadline: string | null;
  paperIndex: number;
  paperCount: number;
  paper: Omit<PlanPaper, "questions"> | null;
  currentQuestionIndex: number;
  questions: QuestionView[];
  responses: Record<string, { answer: unknown; flagged: boolean }>;
}

// Everything the client may see for the CURRENT paper only - never a
// correctAnswer, never an audio transcript, never a future paper's
// questions.
// A question's own passage for the v2 screen, via the shared parser: plain
// text stays `passage` (read in the passage panel), an audio/picture spec
// becomes `stimulus` (played / described), and nothing raw is ever sent.
// Questions with an item group use the group's stimulus instead.
function v2Stimulus(q: { id: string; type: string; category: string; passage: string | null; itemGroup: unknown }): Pick<QuestionView, "passage" | "stimulus"> {
  const { stimulus, passage } = candidateStimulus(q.passage, q);
  const media = !q.itemGroup && (stimulus.kind === "audio" || stimulus.kind === "image") ? stimulus : null;
  return { passage, stimulus: media };
}

export async function buildStateView(mockTestSessionId: string): Promise<ExamStateView | null> {
  const state = await processExpiry(mockTestSessionId);
  if (!state) return null;
  const plan = parsePlan(state.planJson);
  const base = {
    serverNow: new Date().toISOString(),
    examDeadline: state.examDeadline.toISOString(),
    paperCount: plan.papers.length,
  };

  if (state.status === "COMPLETED") {
    return { ...base, status: "COMPLETED", paperDeadline: null, paperIndex: plan.papers.length, paper: null, currentQuestionIndex: 0, questions: [], responses: {} };
  }

  const paper = plan.papers[state.currentPaperIndex];
  const ids = paper.questions.map((q) => q.questionId);
  const [rows, responses] = await Promise.all([
    db.practiceQuestion.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        type: true,
        category: true,
        prompt: true,
        passage: true,
        options: true,
        itemGroup: { select: { id: true, type: true, title: true, text: true, assetKey: true, playLimit: true } },
      },
    }),
    db.itemResponse.findMany({ where: { mockTestSessionId, questionId: { in: ids } } }),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const plays = JSON.parse(state.audioPlaysJson) as Record<string, number>;

  const questions: QuestionView[] = paper.questions
    .map((pq) => {
      const q = byId.get(pq.questionId);
      if (!q) return null;
      let options: string[] | null = null;
      if (q.options) {
        try {
          const parsed = JSON.parse(q.options);
          if (Array.isArray(parsed)) options = seededShuffle(parsed.map(String), `${mockTestSessionId}:${q.id}`);
        } catch {
          options = null;
        }
      }
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        ...v2Stimulus(q),
        options,
        partId: pq.partId,
        itemGroup: q.itemGroup
          ? {
              id: q.itemGroup.id,
              type: q.itemGroup.type,
              title: q.itemGroup.title,
              text: q.itemGroup.text,
              hasAsset: !!q.itemGroup.assetKey,
              playLimit: q.itemGroup.playLimit,
              playsUsed: plays[q.itemGroup.id] ?? 0,
            }
          : null,
      };
    })
    .filter((q): q is QuestionView => q !== null);

  const responseMap: ExamStateView["responses"] = {};
  for (const r of responses) {
    let answer: unknown = null;
    if (r.answerJson) {
      try {
        answer = JSON.parse(r.answerJson);
      } catch {
        answer = null;
      }
    }
    responseMap[r.questionId] = { answer, flagged: r.flaggedForReview };
  }

  const { questions: _q, ...paperMeta } = paper;
  void _q;
  return {
    ...base,
    status: "IN_PROGRESS",
    paperDeadline: state.paperDeadline.toISOString(),
    paperIndex: state.currentPaperIndex,
    paper: paperMeta,
    currentQuestionIndex: state.currentQuestionIndex,
    questions,
    responses: responseMap,
  };
}

export function itemGroupIdsInPlan(plan: ExamPlan, questionGroups: Map<string, string | null>): Set<string> {
  const ids = new Set<string>();
  for (const paper of plan.papers) {
    for (const q of paper.questions) {
      const g = questionGroups.get(q.questionId);
      if (g) ids.add(g);
    }
  }
  return ids;
}
