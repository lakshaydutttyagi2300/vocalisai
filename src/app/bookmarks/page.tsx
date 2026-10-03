import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { servableWhere } from "@/lib/practice-bank";
import { BookmarksList } from "@/components/practice-tests/BookmarksList";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";

export const metadata = { title: "Bookmarks - VocalisAi" };

// Questions the candidate saved, to revise later.
export default async function BookmarksPage() {
  const session = await getServerSession(authOptions);
  const [bookmarks, subjects] = await Promise.all([
    db.questionBookmark.findMany({
      where: { userId: session!.user.id, question: servableWhere() },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { questionId: true, question: { select: { prompt: true, difficulty: true, category: true, subject: { select: { name: true } } } } },
    }),
    db.catalogSubject.findMany({ where: { legacyCategory: { not: null } }, select: { name: true, legacyCategory: true } }),
  ]);
  const legacyName = new Map(subjects.map((s) => [s.legacyCategory!, s.name]));

  return (
    <div className="pb-20">
      <MediaHero {...HEROES.bookmarks} title="Bookmarks" stats={[`${bookmarks.length} saved`]} />
      <div className="page-container mt-10">
      <BookmarksList
        initial={bookmarks.map((b) => ({
          questionId: b.questionId,
          prompt: b.question.prompt,
          subject: b.question.subject?.name ?? legacyName.get(b.question.category) ?? null,
          level: b.question.difficulty,
        }))}
      />
      </div>
    </div>
  );
}
