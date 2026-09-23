// General-purpose Full Mock Assessment template - broad English
// communication coverage, no Customer-Service section, the platform's
// default (repositioning Phase 5). Was previously created ad hoc via the
// admin API against the live database only; committed here so a fresh
// database gets it too, and re-running this script is a no-op once seeded.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const NAME = "General English Communication Assessment";

const SECTIONS = [
  { order: 1, category: "LISTENING", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 2, category: "READING", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 3, category: "READING_COMPREHENSION", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 4, category: "PRONUNCIATION", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 5, category: "GRAMMAR", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 6, category: "VOCABULARY", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 7, category: "FLUENCY", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 8, category: "SPEAKING", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 9, category: "SITUATIONAL_JUDGEMENT", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 10, category: "INTERVIEW", difficulty: "INTERMEDIATE", questionCount: 2 },
];

async function main() {
  const existing = await db.mockTestTemplate.findFirst({ where: { name: NAME } });
  if (existing) {
    console.log("Skipping: general template already seeded.");
    return;
  }

  // First template ever on a truly fresh database becomes default anyway
  // (see src/app/api/admin/templates POST), but this script may run after
  // other templates already exist - explicitly set as default here so a
  // fresh seed always ends up with this one, not an arbitrary earlier one.
  await db.mockTestTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });

  const template = await db.mockTestTemplate.create({
    data: {
      name: NAME,
      isDefault: true,
      sections: { create: SECTIONS },
    },
    include: { sections: true },
  });

  console.log(`Seeded template "${template.name}" with ${template.sections.length} sections as the default.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
