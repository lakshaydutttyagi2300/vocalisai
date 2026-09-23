// Workplace-focused Full Mock Assessment template - customer-service and
// supervisor-scenario heavy, for candidates specifically prepping for a
// voice-process/workplace-communication role. Not the platform default;
// see seed-mock-test-template-general.mjs for the general-purpose default.
//
// "Reading" here means read-aloud (the READING category, voice) - not the
// READING_COMPREHENSION practice mode. "Customer-Service Roleplay" is a
// single recorded response to a scenario, like the other voice sections
// here - the full multi-turn AI conversation remains available separately
// for deeper practice.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const NAME = "Workplace Communication Assessment";
// Renamed from "Standard BPO Assessment" (repositioning work) - checked too
// so re-running this script against an older, unrenamed database doesn't
// create a duplicate template.
const LEGACY_NAME = "Standard BPO Assessment";

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
  const existing = await db.mockTestTemplate.findFirst({
    where: { name: { in: [NAME, LEGACY_NAME] } },
  });
  if (existing) {
    console.log(`Skipping: "${existing.name}" already seeded.`);
    return;
  }

  const template = await db.mockTestTemplate.create({
    data: {
      name: NAME,
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
