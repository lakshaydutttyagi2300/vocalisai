// Brings database text shown to visitors in line with the October 2026 brand
// wording (an AI communication and interview coach, without "BPO" or
// "call/contact centre"), and lists Interview Preparation first among goals.
// Each change applies only while the field still holds the exact old text, so
// edits made since in the admin screens are never overwritten, and running it
// twice changes nothing the second time. Slugs and ids are never changed.
//
//   node scripts/refresh-public-copy.mjs                    # preview, dev database (.env)
//   node scripts/refresh-public-copy.mjs --apply
//   DATABASE_URL=... node scripts/refresh-public-copy.mjs --apply --production

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertDevDatabase } from "../prisma/exam-demo/seed.mjs";

const apply = process.argv.includes("--apply");
const production = process.argv.includes("--production");
const host = assertDevDatabase(process.env.DATABASE_URL, { allowProduction: production });
console.log(`Database: ${host}${production ? "  (PRODUCTION)" : ""}  ·  ${apply ? "apply" : "preview only"}`);

/** [model, where, field, old text, new text] */
const TEXT = [
  ["goalTrack", { slug: "BPO_SUPPORT" }, "name", "BPO / Customer Support", "Customer Support"],
  [
    "examFamily",
    { description: "Listening, voice and customer handling for support, contact-centre and BPO roles." },
    "description",
    "Listening, voice and customer handling for support, contact-centre and BPO roles.",
    "Listening, speaking and customer handling for customer-facing and support roles.",
  ],
  [
    "examFamily",
    { description: "Recruitment, pre-employment and role-specific assessments, including BPO/MNC interviews." },
    "description",
    "Recruitment, pre-employment and role-specific assessments, including BPO/MNC interviews.",
    "Recruitment, pre-employment and role-specific assessments, including company interview rounds.",
  ],
  [
    "examFamily",
    { description: "English for customer service and contact-centre work." },
    "description",
    "English for customer service and contact-centre work.",
    "English for customer service and other customer-facing work.",
  ],
  ["examVariant", { slug: "CONTACT_CENTRE_SCREENING" }, "name", "Contact Centre Screening", "Customer Service Screening"],
  [
    "examVariant",
    { slug: "CONTACT_CENTRE_SCREENING" },
    "description",
    "A short screening like a first-round BPO test: understand callers, then answer customers out loud.",
    "A short screening like a first-round customer service test: understand callers, then answer customers out loud.",
  ],
  ["examVariant", { slug: "CUSTOMER_SUPPORT_BPO" }, "name", "Customer Support (BPO) English", "Customer Support English"],
  [
    "examVariant",
    { slug: "CUSTOMER_SUPPORT_BPO" },
    "description",
    "A short, demanding test for call-centre and customer support jobs: US and UK calls, repeating, dictation, grammar, retelling, fast answers and two customer role-play calls. Score out of 100.",
    "A short, demanding test for customer support and customer-facing jobs: US and UK calls, repeating, dictation, grammar, retelling, fast answers and two customer role-play calls. Score out of 100.",
  ],
];

/** Goal order: interview preparation first. Applied only while the old order is still in place. */
const OLD_ORDER = ["GENERAL_ENGLISH", "BPO_SUPPORT", "INTERVIEW_PREP", "CAMPUS", "STUDY_ABROAD"];
const NEW_ORDER = ["INTERVIEW_PREP", "GENERAL_ENGLISH", "CAMPUS", "BPO_SUPPORT", "STUDY_ABROAD"];

const db = new PrismaClient();
let changes = 0;
try {
  for (const [model, where, field, from, to] of TEXT) {
    const rows = await db[model].findMany({ where: { ...where, [field]: from }, select: { id: true } });
    for (const r of rows) {
      changes++;
      console.log(`  ${model}.${field}: "${from.slice(0, 60)}" -> "${to.slice(0, 60)}"`);
      if (apply) await db[model].update({ where: { id: r.id }, data: { [field]: to } });
    }
  }

  const tracks = await db.goalTrack.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, sortOrder: true } });
  const current = tracks.map((t) => t.slug).filter((s) => OLD_ORDER.includes(s));
  if (current.join() === OLD_ORDER.join()) {
    const slots = tracks.filter((t) => OLD_ORDER.includes(t.slug)).map((t) => t.sortOrder);
    changes++;
    console.log(`  goal order: ${OLD_ORDER.join(", ")} -> ${NEW_ORDER.join(", ")}`);
    if (apply) {
      for (const [i, slug] of NEW_ORDER.entries()) {
        const t = tracks.find((x) => x.slug === slug);
        if (t) await db.goalTrack.update({ where: { id: t.id }, data: { sortOrder: slots[i] } });
      }
    }
  }
  console.log(changes ? `${changes} change(s)${apply ? " applied" : " to make (preview; add --apply)"}.` : "Nothing to change: already up to date.");
} finally {
  await db.$disconnect();
}
