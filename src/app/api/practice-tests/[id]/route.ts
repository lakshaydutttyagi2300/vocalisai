import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PracticeTestError, practiceTestView } from "@/lib/practice-tests";

// One of the candidate's own practice tests (a timed test past its time is submitted first).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  try {
    return NextResponse.json(await practiceTestView(session.user.id, (await params).id));
  } catch (err) {
    if (err instanceof PracticeTestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("practice test: load failed", err);
    return NextResponse.json({ error: "We couldn't load this test. Please try again." }, { status: 500 });
  }
}
