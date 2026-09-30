import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { PracticeTestError, setBookmark } from "@/lib/practice-tests";

const bodySchema = z.object({ questionId: z.string().min(1).max(40), bookmarked: z.boolean() });

// Bookmarks (or un-bookmarks) a question for the signed-in candidate.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a question to bookmark." }, { status: 400 });
  try {
    await setBookmark(session.user.id, parsed.data.questionId, parsed.data.bookmarked);
    return NextResponse.json({ bookmarked: parsed.data.bookmarked });
  } catch (err) {
    if (err instanceof PracticeTestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("bookmark failed", err);
    return NextResponse.json({ error: "We couldn't update your bookmark. Please try again." }, { status: 500 });
  }
}
