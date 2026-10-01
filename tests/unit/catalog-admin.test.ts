import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createItem, createQuestion, deleteItem, importQuestions, questionProblem, questionStats, removeQuestion, updateItem, updateQuestion } from "@/lib/catalog-admin";
import { pickFromPool, poolWhere } from "@/lib/practice-bank";

const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => session);
const { POST: createRoute } = await import("@/app/api/admin/catalogue/[kind]/route");

const run = Date.now();
let categoryId = "";
let examId = "";
let subjectId = "";
let skillId = "";
let subjectSlug = "";
let examSlug = "";
let userId = "";

const mcq = (prompt: string, extra: Record<string, unknown> = {}) => ({
  subjectId,
  skillId,
  difficulty: "INTERMEDIATE",
  type: "MULTIPLE_CHOICE",
  prompt,
  options: ["Delhi", "Mumbai", "Kolkata"],
  correctAnswer: "Delhi",
  explanation: "New Delhi is the capital.",
  tags: ["Capitals"],
  ...extra,
});

beforeAll(async () => {
  userId = (await db.user.create({ data: { email: `cat-admin-${run}@example.test`, passwordHash: "x", name: "Admin Test" } })).id;
  categoryId = (await createItem("categories", { name: `Test Category ${run}` }))!.id;
  subjectSlug = `gk-${run}`;
  subjectId = (await createItem("subjects", { name: "Test GK", slug: subjectSlug }))!.id;
  skillId = (await createItem("skills", { subjectId, name: "Capitals" }))!.id;
  examSlug = `test-exam-${run}`;
  examId = (await createItem("exams", { categoryId, name: "Test Exam", slug: examSlug, subjects: [{ subjectId, mockQuestionCount: 5 }] }))!.id;
}, 120_000);

afterAll(async () => {
  await db.user.deleteMany({ where: { id: userId } });
  await db.practiceQuestion.deleteMany({ where: { subjectId } });
  await db.catalogExam.deleteMany({ where: { categoryId } });
  await db.catalogSubject.deleteMany({ where: { id: subjectId } });
  await db.catalogCategory.deleteMany({ where: { id: categoryId } });
}, 120_000);

describe("question validation", () => {
  it("accepts answers each type's marker accepts, and explains what's wrong otherwise", () => {
    expect(questionProblem({ type: "MULTIPLE_CHOICE", options: ["a", "b"], correctAnswer: "a" })).toBeNull();
    expect(questionProblem({ type: "MULTIPLE_CHOICE", options: ["a", "b"], correctAnswer: "c" })).toMatch(/match one of the options/);
    expect(questionProblem({ type: "MULTIPLE_CHOICE", options: ["a"], correctAnswer: "a" })).toMatch(/two options/);
    expect(questionProblem({ type: "MULTIPLE_CHOICE", options: ["a", "A"], correctAnswer: "a" })).toMatch(/different/);
    expect(questionProblem({ type: "TRUE_FALSE_NOT_GIVEN", options: null, correctAnswer: "TRUE" })).toBeNull();
    expect(questionProblem({ type: "TRUE_FALSE_NOT_GIVEN", options: null, correctAnswer: "Yes" })).toMatch(/TRUE, FALSE, NOT_GIVEN/);
    expect(questionProblem({ type: "NUMERIC_ENTRY", options: null, correctAnswer: '{"value": 42}' })).toBeNull();
    expect(questionProblem({ type: "NUMERIC_ENTRY", options: null, correctAnswer: "42" })).toMatch(/JSON/);
    expect(questionProblem({ type: "GAP_FILL", options: null, correctAnswer: '[["a","an"],["comfortable"]]' })).toBeNull();
    expect(questionProblem({ type: "MULTI_SELECT", options: ["a", "b", "c"], correctAnswer: '["a","c"]' })).toBeNull();
    expect(questionProblem({ type: "MULTI_SELECT", options: ["a", "b"], correctAnswer: '["a","z"]' })).toMatch(/one of the options/);
  });
});

describe("catalogue admin", { timeout: 180_000 }, () => {
  it("creates, edits, archives and serves questions by status", async () => {
    const { id } = await createQuestion(mcq("What is the capital of India?", { examIds: [examId] }));
    const q = await db.practiceQuestion.findUniqueOrThrow({ where: { id }, include: { exams: true } });
    expect(q).toMatchObject({ category: "CATALOG", subjectId, catalogSkillId: skillId, difficulty: "INTERMEDIATE", tags: ["capitals"], isActive: true, archivedAt: null });
    expect(q.exams.map((e) => e.examId)).toEqual([examId]);

    await expect(createQuestion(mcq("what is the capital of india?"))).rejects.toThrow(/already exists/);
    await expect(createQuestion(mcq("Wrong answer", { correctAnswer: "Chennai" }))).rejects.toThrow(/match one of the options/);

    const pool = () => pickFromPool(userId, poolWhere({ subject: { id: subjectId, legacyCategory: null }, difficulty: "INTERMEDIATE", examId }), 10);
    expect(await pool()).toEqual([id]);
    await updateQuestion(id, { status: "INACTIVE" });
    expect(await pool()).toEqual([]);
    await updateQuestion(id, { status: "ACTIVE", explanation: "Updated." });
    expect(await pool()).toEqual([id]);
    await updateQuestion(id, { status: "ARCHIVED" });
    expect(await pool()).toEqual([]);
    expect((await db.practiceQuestion.findUniqueOrThrow({ where: { id } })).archivedAt).not.toBeNull();
  });

  it("deletes a never-answered question but archives an answered one", async () => {
    const fresh = await createQuestion(mcq("Capital of Maharashtra?", { options: ["Mumbai", "Pune"], correctAnswer: "Mumbai" }));
    expect(await removeQuestion(fresh.id)).toBe("deleted");
    const answered = await createQuestion(mcq("Capital of West Bengal?", { options: ["Kolkata", "Howrah"], correctAnswer: "Kolkata" }));
    await db.practiceAttempt.create({ data: { userId, questionId: answered.id, category: "CATALOG", difficulty: "INTERMEDIATE", timeTakenSeconds: 12, isCorrect: true, score: 100 } });
    await db.questionSeen.create({ data: { userId, questionId: answered.id, timesSeen: 2, timesAttempted: 1, timesCorrect: 1 } });
    expect(await removeQuestion(answered.id)).toBe("archived");
    expect((await questionStats([answered.id])).get(answered.id)).toEqual({ timesServed: 2, candidates: 1, attempts: 1, correct: 1, accuracy: 100, avgSeconds: 12 });
  });

  it("imports only when every row is valid, reporting each bad row", async () => {
    const good = { subject: subjectSlug, skill: "capitals", exams: examSlug, difficulty: "beginner", question: "Capital of Kerala?", options: "Thiruvananthapuram | Kochi", correctAnswer: "Thiruvananthapuram", tags: "states; south" };
    const checked = await importQuestions(
      [good, { ...good, question: "Capital of Kerala?" }, { ...good, question: "Q2", subject: "nope" }, { ...good, question: "Q3", correctAnswer: "Kozhikode" }],
      false
    );
    expect(checked.created).toBe(0);
    expect(checked.errors.map((e) => e.row)).toEqual([3, 4, 5]);
    expect(checked.errors[1].message).toMatch(/Unknown subject/);

    const dry = await importQuestions([good, { ...good, question: "Capital of Goa?", options: "Panaji | Margao", correctAnswer: "Panaji", difficulty: "EXPERT" }], true);
    expect(dry).toMatchObject({ total: 2, valid: 2, created: 0, errors: [] });
    const done = await importQuestions([good, { ...good, question: "Capital of Goa?", options: "Panaji | Margao", correctAnswer: "Panaji", difficulty: "EXPERT" }], false);
    expect(done.created).toBe(2);
    const imported = await db.practiceQuestion.findFirstOrThrow({ where: { subjectId, prompt: "Capital of Kerala?" }, include: { exams: true } });
    expect(imported).toMatchObject({ difficulty: "BEGINNER", catalogSkillId: skillId, tags: ["states", "south"] });
    expect(imported.exams).toHaveLength(1);
    expect((await importQuestions([good], true)).errors[0].message).toMatch(/Already in the question bank/);
    // A spreadsheet TRUE cell arrives as a boolean.
    const tf = await importQuestions([{ subject: subjectSlug, difficulty: "BEGINNER", type: "TRUE_FALSE_NOT_GIVEN", question: "The Ganga flows into the Bay of Bengal.", correctAnswer: true }], true);
    expect(tf.errors).toEqual([]);
  });

  it("edits the structure; switching an exam off changes nothing else", async () => {
    await updateItem("exams", examId, { isPopular: true, mockMinutes: 45, sortOrder: 7, subjects: [{ subjectId, mockQuestionCount: 12 }] });
    expect(await db.catalogExamSubject.findFirst({ where: { examId } })).toMatchObject({ mockQuestionCount: 12 });
    await expect(createItem("subjects", { name: "Test GK", slug: subjectSlug })).rejects.toThrow(/already used/);
    await updateItem("exams", examId, { isActive: false });
    expect(await db.catalogExam.findUniqueOrThrow({ where: { id: examId } })).toMatchObject({ isActive: false, isPopular: true, sortOrder: 7, mockMinutes: 45 });
    await updateItem("exams", examId, { isActive: true });
  });

  it("deletes safely: a category takes its exams; questions and candidates' tests stay, only unlinked", async () => {
    const cat = (await createItem("categories", { name: `Test Category B ${run}` }))!.id;
    const exam = (await createItem("exams", { categoryId: cat, name: "Test Exam B", slug: `${examSlug}-b`, subjects: [{ subjectId, mockQuestionCount: 5 }] }))!.id;
    const sub = (await createItem("subjects", { name: "Test Spare", slug: `${subjectSlug}-spare` }))!.id;
    const skill = (await createItem("skills", { subjectId: sub, name: "Spare" }))!.id;
    const q = await db.practiceQuestion.create({
      data: { category: "VOCABULARY", difficulty: "BEGINNER", type: "MULTIPLE_CHOICE", prompt: `Spare question ${run}`, options: JSON.stringify(["a", "b"]), correctAnswer: "a", timeLimitSeconds: 30, subjectId: sub, catalogSkillId: skill, exams: { create: { examId: exam } } },
    });
    const t = await db.practiceTest.create({ data: { userId, examId: exam, subjectId: sub, catalogSkillId: skill, difficulty: "BEGINNER", mode: "PRACTICE", questionIds: [q.id], totalCount: 1 } });
    try {
      await deleteItem("skills", skill);
      expect(await db.practiceQuestion.findUniqueOrThrow({ where: { id: q.id } })).toMatchObject({ catalogSkillId: null, subjectId: sub });
      expect(await deleteItem("categories", cat)).toEqual({ exams: 1 });
      expect(await db.catalogExam.findUnique({ where: { id: exam } })).toBeNull();
      expect(await db.questionExam.count({ where: { questionId: q.id } })).toBe(0);
      await deleteItem("subjects", sub);
      expect(await db.practiceQuestion.findUniqueOrThrow({ where: { id: q.id } })).toMatchObject({ subjectId: null });
      expect(await db.practiceTest.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({ examId: null, subjectId: null, catalogSkillId: null, questionIds: [q.id] });
      await expect(deleteItem("exams", exam)).rejects.toThrow(/no longer exists/);
    } finally {
      await db.practiceTest.deleteMany({ where: { id: t.id } });
      await db.practiceQuestion.deleteMany({ where: { id: q.id } });
      await db.catalogExam.deleteMany({ where: { categoryId: cat } });
      await db.catalogCategory.deleteMany({ where: { id: cat } });
      await db.catalogSubject.deleteMany({ where: { id: sub } });
    }
  });

  it("refuses non-admins", async () => {
    session.getServerSession.mockResolvedValue({ user: { id: userId, role: "CANDIDATE" } });
    const res = await createRoute(new Request("http://localhost/api/admin/catalogue/categories", { method: "POST", body: JSON.stringify({ name: "Nope" }) }), { params: Promise.resolve({ kind: "categories" }) });
    expect(res.status).toBe(403);
  });
});
