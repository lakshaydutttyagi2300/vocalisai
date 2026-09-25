// P1-H: seeds (and removes) the dev-only IELTS-style Academic demo exam
// from content.mjs. Kept separate from the CLI (prisma/seed-exam-demo.mjs)
// so tests can run it against the TEST branch and clean up after.
//
// What it creates, all tagged so removeExamDemo() finds exactly this and
// nothing else:
//   ExamFamily IELTS_STYLE (reused if it already exists - never deleted
//     here unless this seed created it and nothing else uses it)
//   ExamVariant ACADEMIC_DEMO + its 4 papers and 12 parts
//   ItemGroups (audio / passage / chart) and PracticeQuestions, every
//     question pinned to its part via PracticeQuestion.examPartId
//   MockTestTemplate "IELTS-style Academic (demo)" with one section per
//     part, linked to the variant and each part.
// Nothing existing is modified, except the default-template switch when
// the caller explicitly asks for it (makeDefault).

import {
  DEMO_DIFFICULTY,
  DEMO_FAMILY_SLUG,
  DEMO_PAPERS,
  DEMO_SCORE_SCALE,
  DEMO_TEMPLATE_NAME,
  DEMO_VARIANT_NAME,
  DEMO_VARIANT_SLUG,
} from "./content.mjs";

// Neon endpoints this seed may write to: the project's development and
// test branches. Anything else (production, or an unknown host) is refused
// outright - there is deliberately no override flag.
export const ALLOWED_DB_HOST_PREFIXES = ["ep-spring-breeze-b4yfk9e8", "ep-flat-salad-b4wht0vo", "localhost", "127.0.0.1"];

export function assertDevDatabase(databaseUrl) {
  let host = "";
  try {
    host = new URL(databaseUrl ?? "").hostname;
  } catch {
    host = "";
  }
  if (!ALLOWED_DB_HOST_PREFIXES.some((p) => host === p || host.startsWith(`${p}.`) || host.startsWith(`${p}-`))) {
    throw new Error(`Refusing to seed the demo exam into "${host || "an unknown database"}" - it only runs on the dev/test branches.`);
  }
  return host;
}

const FAMILY_FALLBACK = { name: "IELTS-style", description: "Academic and General Training style four-skill English proficiency testing." };

// familySlug is only overridden by tests, so they never touch (or collide
// with other tests over) the real IELTS_STYLE family row.
async function findVariant(db, familySlug) {
  const family = await db.examFamily.findUnique({ where: { slug: familySlug } });
  if (!family) return { family: null, variant: null };
  const variant = await db.examVariant.findUnique({ where: { familyId_slug: { familyId: family.id, slug: DEMO_VARIANT_SLUG } } });
  return { family, variant };
}

export async function seedExamDemo(
  db,
  { withAssets = false, makeDefault = false, log = () => {}, buildGroupAsset, familySlug = DEMO_FAMILY_SLUG } = {}
) {
  const existing = await findVariant(db, familySlug);
  if (existing.variant) {
    log(`Skipping: the demo exam "${DEMO_VARIANT_NAME}" already exists. Run with --reset to rebuild it.`);
    const template = await db.mockTestTemplate.findFirst({ where: { examVariantId: existing.variant.id } });
    if (template && makeDefault) await setDefaultTemplate(db, template.id, log);
    return { created: false, variantId: existing.variant.id, templateId: template?.id ?? null };
  }

  let familyCreated = false;
  let family = existing.family;
  if (!family) {
    family = await db.examFamily.create({
      data: familySlug === DEMO_FAMILY_SLUG ? { slug: familySlug, ...FAMILY_FALLBACK } : { slug: familySlug, name: `Test family ${familySlug}` },
    });
    familyCreated = true;
  }

  const variant = await db.examVariant.create({
    data: { familyId: family.id, slug: DEMO_VARIANT_SLUG, name: DEMO_VARIANT_NAME, scoreScale: DEMO_SCORE_SCALE },
  });

  const sections = [];
  const assetNotes = [];
  let sectionOrder = 1;
  let questionTotal = 0;

  for (const [paperIndex, p] of DEMO_PAPERS.entries()) {
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
            metadataJson: JSON.stringify({ demo: DEMO_VARIANT_SLUG, ...(g.type === "AUDIO" ? { voice: "synthetic (Windows built-in)" } : {}) }),
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

      sections.push({
        order: sectionOrder++,
        category: p.category,
        difficulty: DEMO_DIFFICULTY,
        questionCount: pt.questionCount,
        examPartId: part.id,
      });
    }
  }

  const template = await db.mockTestTemplate.create({
    data: { name: DEMO_TEMPLATE_NAME, examVariantId: variant.id, sections: { create: sections } },
  });
  if (makeDefault) await setDefaultTemplate(db, template.id, log);

  log(`Seeded "${DEMO_TEMPLATE_NAME}": ${DEMO_PAPERS.length} papers, ${sections.length} parts, ${questionTotal} questions${familyCreated ? " (created the IELTS-style family)" : ""}.`);
  for (const note of assetNotes) log(`  No asset for ${note}`);
  return { created: true, variantId: variant.id, templateId: template.id, familyCreated, questionTotal, assetNotes };
}

async function setDefaultTemplate(db, templateId, log) {
  const previous = await db.mockTestTemplate.findFirst({ where: { isDefault: true } });
  if (previous?.id === templateId) return;
  await db.$transaction([
    db.mockTestTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    db.mockTestTemplate.update({ where: { id: templateId }, data: { isDefault: true } }),
  ]);
  log(`Made "${DEMO_TEMPLATE_NAME}" the default mock test${previous ? ` (was "${previous.name}" - use Admin > Templates > Set as default to switch back)` : ""}.`);
}

// Removes exactly what seedExamDemo created. Refuses (throws) if anyone has
// already sat the demo, rather than deleting their answers - those
// sessions must be removed deliberately first.
export async function removeExamDemo(db, { log = () => {}, removeFamily = false, familySlug = DEMO_FAMILY_SLUG } = {}) {
  const { family, variant } = await findVariant(db, familySlug);
  if (!variant) {
    log("Nothing to remove: no demo exam found.");
    return { removed: false };
  }

  const partIds = (
    await db.examPart.findMany({ where: { paper: { variantId: variant.id } }, select: { id: true } })
  ).map((p) => p.id);
  const questions = await db.practiceQuestion.findMany({ where: { examPartId: { in: partIds } }, select: { id: true, itemGroupId: true } });
  const questionIds = questions.map((q) => q.id);
  const groupIds = [...new Set(questions.map((q) => q.itemGroupId).filter(Boolean))];
  const templates = await db.mockTestTemplate.findMany({ where: { examVariantId: variant.id }, select: { id: true, isDefault: true } });
  const templateIds = templates.map((t) => t.id);

  const [responses, sessions] = await Promise.all([
    db.itemResponse.count({ where: { questionId: { in: questionIds } } }),
    db.mockTestSession.count({ where: { templateId: { in: templateIds } } }),
  ]);
  if (responses > 0 || sessions > 0) {
    throw new Error(`The demo exam has been used (${sessions} session(s), ${responses} answer(s)); remove those sessions first.`);
  }
  if (templates.some((t) => t.isDefault)) {
    throw new Error("The demo template is the current default mock test - set another template as default first (Admin > Templates).");
  }

  await db.mockTestTemplate.deleteMany({ where: { id: { in: templateIds } } });
  await db.practiceQuestion.deleteMany({ where: { id: { in: questionIds } } });
  await db.itemGroup.deleteMany({ where: { id: { in: groupIds }, questions: { none: {} } } });
  await db.examVariant.delete({ where: { id: variant.id } }); // cascades papers + parts

  // The family is shared catalogue data an admin may rely on, so it is
  // only removed when the caller says this seed created it (tests) and it
  // is now empty.
  let familyRemoved = false;
  if (removeFamily && family && (await db.examVariant.count({ where: { familyId: family.id } })) === 0) {
    await db.examFamily.delete({ where: { id: family.id } });
    familyRemoved = true;
  }
  log(`Removed the demo exam (${questionIds.length} questions, ${groupIds.length} groups).`);
  return { removed: true, questionCount: questionIds.length, groupCount: groupIds.length, familyRemoved };
}
