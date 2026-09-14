// Bootstraps a single ADMIN account for Phase 17. Deliberately a separate
// identity from the candidate test accounts (rahul.verma.test@...) so admin
// and candidate access can be tested independently, matching how this would
// work in production - real admins are not also candidates.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const EMAIL = "admin@proacting.test";
const PASSWORD = "AdminPass123";

async function main() {
  const existing = await db.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    if (existing.role !== "ADMIN") {
      await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
      console.log(`Promoted existing user ${EMAIL} to ADMIN.`);
    } else {
      console.log(`Skipping: ${EMAIL} already exists as ADMIN.`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await db.user.create({
    data: {
      name: "Platform Admin",
      email: EMAIL,
      passwordHash,
      role: "ADMIN",
      profile: { create: {} },
    },
  });
  console.log(`Created ADMIN account: ${EMAIL} / ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
