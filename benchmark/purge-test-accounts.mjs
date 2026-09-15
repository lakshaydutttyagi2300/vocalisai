// One-time cleanup: removes the fake test accounts created by this
// session's own test scripts, keeping only the real account and the
// admin login. Deleting a User cascades (onDelete: Cascade) to every
// related row - Subscription, UsageEvent, PracticeAttempt, recordings,
// etc. - so this is a full, clean removal, not an orphan-leaving one.

import { PrismaClient } from "@prisma/client";

const KEEP_EMAILS = ["lakshaydutttyagi@gmail.com", "admin@proacting.test"];

const db = new PrismaClient();

async function main() {
  const toDelete = await db.user.findMany({
    where: { email: { notIn: KEEP_EMAILS } },
    select: { id: true, email: true },
  });
  console.log(`Deleting ${toDelete.length} test accounts:`);
  for (const u of toDelete) console.log(`  - ${u.email}`);

  const result = await db.user.deleteMany({
    where: { email: { notIn: KEEP_EMAILS } },
  });
  console.log(`\nDeleted ${result.count} users (cascaded to all their related rows).`);

  const remaining = await db.user.findMany({ select: { email: true, role: true } });
  console.log("\nRemaining users:", remaining);
}

main()
  .catch((err) => {
    console.error("FAILED:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
