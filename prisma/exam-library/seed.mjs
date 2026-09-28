// The exam library loader, importable by tests. The command-line wrapper is
// prisma/seed-exam-library.mjs (see there for usage and safety rules).

import { EXAM_LIBRARY, GENERAL_ENGLISH_ASSESSMENT } from "./content.mjs";

/** Adds or refreshes the library. Returns a list of what happened. */
export async function seedExamLibrary(db, { dryRun = false, library = EXAM_LIBRARY, generalEnglish = GENERAL_ENGLISH_ASSESSMENT } = {}) {
  const log = [];
  for (const family of library) {
    let familyRow = await db.examFamily.findUnique({ where: { slug: family.slug } });
    if (!familyRow) {
      log.push(`+ exam type ${family.name}`);
      if (!dryRun) familyRow = await db.examFamily.create({ data: { slug: family.slug, name: family.name, description: family.description } });
    } else if (familyRow.name !== family.name || familyRow.description !== family.description) {
      log.push(`~ exam type ${family.name}`);
      if (!dryRun) familyRow = await db.examFamily.update({ where: { id: familyRow.id }, data: { name: family.name, description: family.description } });
    }

    for (const exam of family.exams) {
      const variant = familyRow ? await db.examVariant.findUnique({ where: { familyId_slug: { familyId: familyRow.id, slug: exam.slug } }, include: { papers: { orderBy: { order: "asc" } } } }) : null;
      if (!variant) {
        const minutes = exam.papers.reduce((n, p) => n + p.minutes, 0);
        log.push(`+ exam ${family.name} · ${exam.name} (${minutes} min)`);
        if (!dryRun) await createExam(db, familyRow.id, exam);
        continue;
      }
      // Existing exam: refresh wording and timings only.
      const changes = [];
      if (variant.name !== exam.name || variant.description !== exam.description) {
        changes.push("name/description");
        if (!dryRun) await db.examVariant.update({ where: { id: variant.id }, data: { name: exam.name, description: exam.description } });
      }
      for (const [i, p] of exam.papers.entries()) {
        const row = variant.papers[i];
        if (!row) continue;
        const durationSeconds = p.minutes * 60;
        if (row.name !== p.name || row.durationSeconds !== durationSeconds) {
          changes.push(`paper ${i + 1}`);
          if (!dryRun) await db.examPaper.update({ where: { id: row.id }, data: { name: p.name, durationSeconds } });
        }
      }
      if (changes.length) log.push(`~ exam ${family.name} · ${exam.name}: ${changes.join(", ")}`);
    }
  }

  // The General English track exam: replace its sections only if they differ.
  const ge = await db.mockTestTemplate.findFirst({
    where: { name: generalEnglish.name, examVariantId: null },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (ge) {
    const want = generalEnglish.sections.map(([c, d, n]) => `${c}:${d}:${n}`).join("|");
    const have = ge.sections.map((s) => `${s.category}:${s.difficulty}:${s.questionCount}`).join("|");
    if (want !== have) {
      log.push(`~ template ${generalEnglish.name}: sections -> ${generalEnglish.sections.map(([c, , n]) => `${c} x${n}`).join(", ")}`);
      if (!dryRun) {
        await db.$transaction([
          db.mockTestTemplateSection.deleteMany({ where: { templateId: ge.id } }),
          db.mockTestTemplateSection.createMany({
            data: generalEnglish.sections.map(([category, difficulty, questionCount], i) => ({ templateId: ge.id, order: i + 1, category, difficulty, questionCount })),
          }),
        ]);
      }
    }
  }
  // Sections asking for more questions than the bank has (the exam still
  // runs, just with fewer questions in that section) - worth adding content.
  const counts = await db.practiceQuestion.groupBy({ by: ["category", "difficulty"], where: { isActive: true, examPartId: null }, _count: { _all: true } });
  const available = new Map(counts.map((c) => [`${c.category}:${c.difficulty}`, c._count._all]));
  for (const family of library) {
    for (const exam of family.exams) {
      for (const p of exam.papers) {
        for (const r of p.parts) {
          for (const [category, difficulty, n] of r.sections) {
            const have = available.get(`${category}:${difficulty}`) ?? 0;
            if (have < n) log.push(`! ${exam.name}: wants ${n} ${category}/${difficulty}, the bank has ${have}`);
          }
        }
      }
    }
  }
  return log;
}

async function createExam(db, familyId, exam) {
  await db.$transaction(async (tx) => {
    const variant = await tx.examVariant.create({
      data: { familyId, slug: exam.slug, name: exam.name, description: exam.description, scoreScale: exam.scale },
    });
    const template = await tx.mockTestTemplate.create({ data: { name: exam.name, examVariantId: variant.id } });
    let sectionOrder = 0;
    for (const [pi, p] of exam.papers.entries()) {
      const paper = await tx.examPaper.create({
        data: {
          variantId: variant.id,
          order: pi + 1,
          name: p.name,
          durationSeconds: p.minutes * 60,
          navigationMode: p.navigation,
          allowReview: p.review,
          instructions: p.instructions,
        },
      });
      for (const [ri, r] of p.parts.entries()) {
        const partRow = await tx.examPart.create({
          data: { paperId: paper.id, order: ri + 1, name: r.name, prepSeconds: r.speaking?.prep ?? null, responseSeconds: r.speaking?.response ?? null },
        });
        for (const [category, difficulty, questionCount] of r.sections) {
          await tx.mockTestTemplateSection.create({
            data: { templateId: template.id, order: ++sectionOrder, category, difficulty, questionCount, examPartId: partRow.id },
          });
        }
      }
    }
  }, { timeout: 60_000 });
}
