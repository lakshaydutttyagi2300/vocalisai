import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const sessions = await db.mockTestSession.findMany({
  include: { events: true },
  orderBy: { startedAt: "desc" },
  take: 5,
});
console.log(JSON.stringify(sessions, null, 2));
await db.$disconnect();
