import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePlan, processExpiry } from "@/lib/exam-runner";
import { TrademarkDisclaimer } from "@/components/exam/TrademarkDisclaimer";

// Results for an exam-runner-v2 session (P1-E). Deliberately shows only
// real, deterministic counts per section - how many auto-marked questions
// were answered correctly, and how many responses (writing, speaking)
// aren't auto-marked at all. No band/score-scale estimate yet: converting
// raw counts to an "-style" band needs per-exam calibration that doesn't
// exist, and showing one anyway would be an invented number.
export default async function ExamResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { sessionId } = await params;
  const mockTestSession = await db.mockTestSession.findUnique({
    where: { id: sessionId },
    include: { template: { include: { examVariant: { include: { family: true } } } } },
  });
  if (!mockTestSession || mockTestSession.userId !== session.user.id) notFound();

  // Finalizes anything still open (e.g. the candidate pressed "End
  // assessment", or time ran out while they were away).
  const state = await processExpiry(sessionId);
  if (!state) notFound();

  const plan = parsePlan(state.planJson);
  const responses = await db.itemResponse.findMany({ where: { mockTestSessionId: sessionId } });
  const byQuestion = new Map(responses.map((r) => [r.questionId, r]));

  const sections = plan.papers.map((paper, index) => {
    let correct = 0;
    let marked = 0;
    let notAutoMarked = 0;
    let answered = 0;
    for (const q of paper.questions) {
      const r = byQuestion.get(q.questionId);
      if (r?.answerJson) answered++;
      if (r?.isCorrect === true) correct++;
      if (r?.isCorrect === null || r?.isCorrect === undefined) notAutoMarked++;
      else marked++;
    }
    const submitted = state.status === "COMPLETED" || index < state.currentPaperIndex;
    return { name: paper.name, total: paper.questions.length, answered, correct, marked, notAutoMarked, submitted };
  });

  const variant = mockTestSession.template?.examVariant;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        {variant ? `${variant.family.name} · ${variant.name}` : "Exam"} practice results
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink-950">Your results</h1>
      <p className="mt-2 text-sm text-slate-600">
        {state.status === "COMPLETED" ? "This exam is complete." : "This exam is still in progress - sections not yet submitted are shown as pending."}
      </p>

      <div className="mt-8 space-y-4">
        {sections.map((s, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-ink-900">{s.name}</h2>
              <span className={`badge ${s.submitted ? "badge-skill" : "badge-neutral"}`}>{s.submitted ? "Submitted" : "Pending"}</span>
            </div>
            {s.submitted ? (
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-slate-500">Answered</dt>
                  <dd className="font-semibold text-ink-900">
                    {s.answered} of {s.total}
                  </dd>
                </div>
                {s.marked > 0 && (
                  <div>
                    <dt className="text-xs text-slate-500">Correct (auto-marked)</dt>
                    <dd className="font-semibold text-ink-900">
                      {s.correct} of {s.marked}
                    </dd>
                  </div>
                )}
                {s.notAutoMarked > 0 && (
                  <div>
                    <dt className="text-xs text-slate-500">Not auto-marked</dt>
                    <dd className="font-semibold text-ink-900">
                      {s.notAutoMarked} response{s.notAutoMarked === 1 ? "" : "s"}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Not submitted yet.</p>
            )}
            {s.submitted && s.notAutoMarked > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Writing and speaking responses are saved but aren&apos;t given an automatic mark here.
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/dashboard" className="btn-primary">
          Back to dashboard
        </Link>
        <Link href="/mock-tests/history" className="btn-secondary">
          All my results
        </Link>
      </div>

      <TrademarkDisclaimer className="mt-10" />
    </div>
  );
}
