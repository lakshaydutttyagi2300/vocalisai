import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PracticeTestError, practiceTestView, submitPracticeTest } from "@/lib/practice-tests";

// Submits the candidate's own practice test and returns it with answers revealed.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { id } = await params;
  try {
    await submitPracticeTest(session.user.id, id);
    return NextResponse.json(await practiceTestView(session.user.id, id));
  } catch (err) {
    if (err instanceof PracticeTestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("practice test: submit failed", err);
    return NextResponse.json({ error: "We couldn't submit your test. Please try again." }, { status: 500 });
  }
}
