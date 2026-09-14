import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rows = await db.practiceQuestion.groupBy({ by: ["category"], _count: true });
for (const r of rows) console.log(r.category + ": " + r._count);
console.log("TOTAL:", await db.practiceQuestion.count());
await db.$disconnect();
