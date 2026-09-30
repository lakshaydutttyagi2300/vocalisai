// Bootstraps an ADMIN account on a development/test database, so admin and
// candidate access can be tested with separate identities.
//
//   ADMIN_SEED_PASSWORD="<at least 12 characters>" node prisma/seed-admin.mjs
//   (optional ADMIN_SEED_EMAIL; defaults to admin@proacting.test)
//
// Refuses the production database: real admins sign up normally and are
// promoted by an existing admin (Admin -> Candidates -> Role).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assertDevDatabase } from "./exam-demo/seed.mjs";

const EMAIL = process.env.ADMIN_SEED_EMAIL || "admin@proacting.test";
const PASSWORD = process.env.ADMIN_SEED_PASSWORD;

if (!PASSWORD || PASSWORD.length < 12) {
  console.error("Set ADMIN_SEED_PASSWORD (at least 12 characters) to choose the account's password.");
  process.exit(1);
}
const host = assertDevDatabase(process.env.DATABASE_URL);

const db = new PrismaClient();

async function main() {
  console.log(`Database: ${host}`);
  const existing = await db.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    if (existing.role !== "ADMIN") {
      await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
      console.log(`Promoted existing user ${EMAIL} to ADMIN (password unchanged).`);
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
  console.log(`Created ADMIN account ${EMAIL} with the password from ADMIN_SEED_PASSWORD.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
