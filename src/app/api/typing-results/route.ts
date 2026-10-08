import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTypingPassage } from "@/lib/typing/passages";
import { MAX_SECONDS, MIN_SECONDS, scoreTyping, typingVerdict } from "@/lib/typing/scoring";

const bodySchema = z.object({
  passageKey: z.string().min(1).max(60),
  typed: z.string().max(5000),
  seconds: z.number().int().min(MIN_SECONDS).max(MAX_SECONDS),
});

const RESULT_FIELDS = { passageKey: true, durationSeconds: true, grossWpm: true, netWpm: true, accuracy: true, createdAt: true } as const;

// Saves one finished typing test. The server scores the typed text against
// the passage itself; the browser's own figures are never trusted.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That test couldn't be saved. Please try again." }, { status: 400 });
  const passage = getTypingPassage(parsed.data.passageKey);
  if (!passage) return NextResponse.json({ error: "That test couldn't be saved. Please try again." }, { status: 400 });

  const limit = await checkRateLimit(`typing:${session.user.id}`, 60, 3600);
  if (!limit.allowed) return NextResponse.json({ error: "You've taken a lot of tests this hour. Have a short break and try again soon." }, { status: 429 });

  const stats = scoreTyping(passage.text, parsed.data.typed, parsed.data.seconds);
  if (stats.typedWords === 0) return NextResponse.json({ error: "Type some of the passage first." }, { status: 400 });

  const saved = await db.typingResult.create({
    data: { userId: session.user.id, passageKey: passage.key, durationSeconds: parsed.data.seconds, ...stats },
    select: RESULT_FIELDS,
  });
  return NextResponse.json({ result: saved, verdict: typingVerdict(stats) });
}

/** The signed-in user's last 10 results, newest first. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const results = await db.typingResult.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 10, select: RESULT_FIELDS });
  return NextResponse.json({ results });
}
