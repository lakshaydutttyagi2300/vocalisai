// Seeds (and removes) the IELTS-style Academic practice tests in
// content.mjs. Kept separate from the CLI (prisma/seed-exam-demo.mjs) so
// tests can run it against the TEST branch and clean up after.
//
// Per practice test, all tagged so removal finds exactly this and nothing
// else:
//   ExamVariant ACADEMIC_PT<n> (under the IELTS_STYLE family, which is
//     reused if it exists and only ever removed on request) + its 4 papers
//     and 12 parts
//   ItemGroups (audio / passage / chart) and PracticeQuestions, every
//     question pinned to its part via PracticeQuestion.examPartId
//   MockTestTemplate "IELTS-style Academic - Practice Test <n>", one
//     section per part, linked to the variant and each part.
// Nothing existing is modified, except the default-template switch when
// the caller explicitly asks for it (makeDefault - dev only).

import { DEMO_DIFFICULTY, DEMO_FAMILY_SLUG, DEMO_SCORE_SCALE, PRACTICE_TESTS } from "./content.mjs";

// Neon endpoints this seed may write to without further ado: the
// project's development and test branches.
export const ALLOWED_DB_HOST_PREFIXES = ["ep-spring-breeze-b4yfk9e8", "ep-flat-salad-b4wht0vo", "localhost", "127.0.0.1"];

// The production endpoint - accepted ONLY when the caller passes
// allowProduction (the CLI's explicit --production flag). Never by default.
export const PRODUCTION_DB_HOST_PREFIX = "ep-falling-sound-b4rdr3dg";

const hostMatches = (host, prefix) => host === prefix || host.startsWith(`${prefix}.`) || host.startsWith(`${prefix}-`);

export function assertDevDatabase(databaseUrl, { allowProduction = false } = {}) {
  let host = "";
  try {
    host = new URL(databaseUrl ?? "").hostname;
  } catch {
    host = "";
  }
  if (ALLOWED_DB_HOST_PREFIXES.some((p) => hostMatches(host, p))) return host;
  if (allowProduction && hostMatches(host, PRODUCTION_DB_HOST_PREFIX)) return host;
  throw new Error(
    hostMatches(host, PRODUCTION_DB_HOST_PREFIX)
      ? `"${host}" is the PRODUCTION database - pass --production explicitly to seed it.`
      : `Refusing to seed the practice tests into "${host || "an unknown database"}" - it only runs on the known dev/test/production branches.`
  );
}

const FAMILY_FALLBACK = { name: "IELTS-style", description: "Academic and General Training style four-skill English proficiency testing." };

// familySlug is only overridden by tests, so they never touch (or collide
// with other tests over) the real IELTS_STYLE family row.
async function findFamily(db, familySlug) {
  return db.examFamily.findUnique({ where: { slug: familySlug } });
}

async function findVariant(db, familyId, slug) {
  if (!familyId) return null;
  return db.examVariant.findUnique({ where: { familyId_slug: { familyId, slug } } });
}

async function seedOneTest(db, family, test, { withAssets, log, buildGroupAsset }) {
  const existing = await findVariant(db, family.id, test.variantSlug);
  if (existing) {
    log(`Skipping: "${test.templateName}" already exists.`);
    const template = await db.mockTestTemplate.findFirst({ where: { examVariantId: existing.id } });
    return { created: false, variantId: existing.id, templateId: template?.id ?? null, questionTotal: 0, assetNotes: [] };
  }

  const variant = await db.examVariant.create({
    data: { familyId: family.id, slug: test.variantSlug, name: test.variantName, scoreScale: DEMO_SCORE_SCALE },
  });

  const sections = [];
  const assetNotes = [];
  let sectionOrder = 1;
  let questionTotal = 0;

  for (const [paperIndex, p] of test.papers.entries()) {
    const paper = await db.examPaper.create({
      data: {
        variantId: variant.id,
        order: paperIndex + 1,
        name: p.name,
        durationSeconds: p.durationSeconds,
        instructions: p.instructions,
        navigationMode: p.navigationMode,
        allowReview: p.allowReview,
      },
    });

    for (const [partIndex, pt] of p.parts.entries()) {
      const part = await db.examPart.create({
        data: {
          paperId: paper.id,
          order: partIndex + 1,
          name: pt.name,
          instructions: pt.instructions,
          prepSeconds: pt.prepSeconds ?? null,
          responseSeconds: pt.responseSeconds ?? null,
        },
      });

      const questionRow = (q, extra = {}) => ({
        category: p.category,
        difficulty: DEMO_DIFFICULTY,
        type: q.type,
        prompt: q.prompt,
        options: q.options ? JSON.stringify(q.options) : null,
        correctAnswer: q.correctAnswer ?? null,
        explanation: q.explanation ?? null,
        scoringCriteria: q.scoringCriteria ?? null,
        timeLimitSeconds: q.timeLimitSeconds,
        source: "SEEDED",
        isActive: true,
        examPartId: part.id,
        ...extra,
      });

      for (const g of pt.groups ?? []) {
        let assetKey = null;
        if (withAssets && buildGroupAsset && (g.script || g.chart)) {
          const res = await buildGroupAsset(g);
          assetKey = res.key;
          if (res.reason) assetNotes.push(`${g.title}: ${res.reason}`);
        }
        const group = await db.itemGroup.create({
          data: {
            type: g.type,
            title: g.title,
            text: g.text ?? null,
            transcript: g.transcript ?? null,
            playLimit: g.playLimit ?? null,
            assetKey,
            metadataJson: JSON.stringify({ practiceTest: test.number, ...(g.type === "AUDIO" ? { voice: "synthetic (Windows built-in)" } : {}) }),
          },
        });
        await db.practiceQuestion.createMany({
          data: g.questions.map((q, i) => questionRow(q, { itemGroupId: group.id, orderInGroup: i + 1 })),
        });
        questionTotal += g.questions.length;
      }

      if (pt.questions?.length) {
        await db.practiceQuestion.createMany({ data: pt.questions.map((q) => questionRow(q)) });
        questionTotal += pt.questions.length;
      }

      sections.push({ order: sectionOrder++, category: p.category, difficulty: DEMO_DIFFICULTY, questionCount: pt.questionCount, examPartId: part.id });
    }
  }

  const template = await db.mockTestTemplate.create({
    data: { name: test.templateName, examVariantId: variant.id, sections: { create: sections } },
  });
  log(`Seeded "${test.templateName}": ${test.papers.length} papers, ${sections.length} parts, ${questionTotal} questions.`);
  for (const note of assetNotes) log(`  No asset for ${note}`);
  return { created: true, variantId: variant.id, templateId: template.id, questionTotal, assetNotes };
}

export async function seedExamDemo(
  db,
  { withAssets = false, makeDefault = false, log = () => {}, buildGroupAsset, familySlug = DEMO_FAMILY_SLUG, tests = PRACTICE_TESTS } = {}
) {
  let family = await findFamily(db, familySlug);
  let familyCreated = false;
  if (!family) {
    family = await db.examFamily.create({
      data: familySlug === DEMO_FAMILY_SLUG ? { slug: familySlug, ...FAMILY_FALLBACK } : { slug: familySlug, name: `Test family ${familySlug}` },
    });
    familyCreated = true;
  }

  const results = [];
  for (const test of tests) results.push(await seedOneTest(db, family, test, { withAssets, log, buildGroupAsset }));

  if (makeDefault && results[0]?.templateId) await setDefaultTemplate(db, results[0].templateId, log);

  return {
    created: results.some((r) => r.created),
    familyCreated,
    tests: results,
    questionTotal: results.reduce((n, r) => n + r.questionTotal, 0),
    assetNotes: results.flatMap((r) => r.assetNotes),
  };
}

async function setDefaultTemplate(db, templateId, log) {
  const previous = await db.mockTestTemplate.findFirst({ where: { isDefault: true } });
  if (previous?.id === templateId) return;
  await db.$transaction([
    db.mockTestTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    db.mockTestTemplate.update({ where: { id: templateId }, data: { isDefault: true } }),
  ]);
  log(`Made Practice Test 1 the default mock test${previous ? ` (was "${previous.name}" - use Admin > Templates > Set as default to switch back)` : ""}.`);
}

// Removes exactly what seedExamDemo created. Refuses (throws) if anyone has
// already sat one of the tests, rather than deleting their answers.
export async function removeExamDemo(db, { log = () => {}, removeFamily = false, familySlug = DEMO_FAMILY_SLUG, tests = PRACTICE_TESTS } = {}) {
  const family = await findFamily(db, familySlug);
  const variants = [];
  for (const t of tests) {
    const v = await findVariant(db, family?.id, t.variantSlug);
    if (v) variants.push(v);
  }
  if (variants.length === 0) {
    log("Nothing to remove: no practice tests found.");
    return { removed: false };
  }
  const variantIds = variants.map((v) => v.id);

  const partIds = (await db.examPart.findMany({ where: { paper: { variantId: { in: variantIds } } }, select: { id: true } })).map((p) => p.id);
  const questions = await db.practiceQuestion.findMany({ where: { examPartId: { in: partIds } }, select: { id: true, itemGroupId: true } });
  const questionIds = questions.map((q) => q.id);
  const groupIds = [...new Set(questions.map((q) => q.itemGroupId).filter(Boolean))];
  const templates = await db.mockTestTemplate.findMany({ where: { examVariantId: { in: variantIds } }, select: { id: true, isDefault: true } });
  const templateIds = templates.map((t) => t.id);

  const [responses, sessions] = await Promise.all([
    db.itemResponse.count({ where: { questionId: { in: questionIds } } }),
    db.mockTestSession.count({ where: { templateId: { in: templateIds } } }),
  ]);
  if (responses > 0 || sessions > 0) {
    throw new Error(`The practice tests have been used (${sessions} session(s), ${responses} answer(s)); remove those sessions first.`);
  }
  if (templates.some((t) => t.isDefault)) {
    throw new Error("A practice test is the current default mock test - set another template as default first (Admin > Templates).");
  }

  await db.mockTestTemplate.deleteMany({ where: { id: { in: templateIds } } });
  await db.practiceQuestion.deleteMany({ where: { id: { in: questionIds } } });
  await db.itemGroup.deleteMany({ where: { id: { in: groupIds }, questions: { none: {} } } });
  await db.examVariant.deleteMany({ where: { id: { in: variantIds } } }); // cascades papers + parts

  // The family is shared catalogue data an admin may rely on, so it is
  // only removed when the caller asks (tests) and it is now empty.
  let familyRemoved = false;
  if (removeFamily && family && (await db.examVariant.count({ where: { familyId: family.id } })) === 0) {
    await db.examFamily.delete({ where: { id: family.id } });
    familyRemoved = true;
  }
  log(`Removed ${variants.length} practice test(s) (${questionIds.length} questions, ${groupIds.length} groups).`);
  return { removed: true, testCount: variants.length, questionCount: questionIds.length, groupCount: groupIds.length, familyRemoved };
}
