// Default Full Mock Assessment template, matching the master spec's example
// section list exactly. This is data, not code - a future admin UI (Phase
// 17) edits these rows directly to change the test structure, no
// application changes needed.
//
// "Reading" here means read-aloud (the READING category, voice) - the real
// BPO definition per Phase 4 - not the READING_COMPREHENSION practice mode.
// "Customer-Service Roleplay" is a single recorded response to a scenario,
// like the other voice sections here - the full multi-turn AI conversation
// (Phase 10/11) remains available separately for deeper practice.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SECTIONS = [
  { order: 1, category: "LISTENING", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 2, category: "READING", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 3, category: "PRONUNCIATION", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 4, category: "GRAMMAR", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 5, category: "VOCABULARY", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 6, category: "FLUENCY", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 7, category: "SPEAKING", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 8, category: "CUSTOMER_SERVICE", difficulty: "INTERMEDIATE", questionCount: 2 },
  { order: 9, category: "SITUATIONAL_JUDGEMENT", difficulty: "INTERMEDIATE", questionCount: 2 },
];

async function main() {
  const existing = await db.mockTestTemplate.findFirst({ where: { name: "Standard BPO Assessment" } });
  if (existing) {
    console.log("Skipping: default template already seeded.");
    return;
  }

  const template = await db.mockTestTemplate.create({
    data: {
      name: "Standard BPO Assessment",
      sections: { create: SECTIONS },
    },
    include: { sections: true },
  });

  console.log(`Seeded template "${template.name}" with ${template.sections.length} sections.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
