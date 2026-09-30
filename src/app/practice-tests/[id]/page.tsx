import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PracticeTestError, practiceTestView } from "@/lib/practice-tests";
import { PracticeTestRunner } from "@/components/practice-tests/PracticeTestRunner";

// One catalogue test: answering it, or reviewing it once submitted.
export default async function PracticeTestPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) notFound();
  const view = await practiceTestView(session.user.id, (await params).id).catch((err) => {
    if (err instanceof PracticeTestError) return null;
    throw err;
  });
  if (!view) notFound();
  return <PracticeTestRunner key={view.status} initial={view} />;
}
