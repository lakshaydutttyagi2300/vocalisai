import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rows = await db.speechAnalysis.findMany({ orderBy: { createdAt: "desc" }, take: 3 });
for (const r of rows) {
  console.log({
    id: r.id,
    attemptId: r.attemptId,
    transcriptionProvider: r.transcriptionProvider,
    transcriptionModel: r.transcriptionModel,
    analysisProvider: r.analysisProvider,
    analysisModel: r.analysisModel,
    estimatedCostUsd: r.estimatedCostUsd,
    wpm: r.wpm,
  });
}
await db.$disconnect();
