import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { GoalChooser } from "@/components/goals/GoalChooser";
import { authOptions } from "@/lib/auth";
import { getUserTrack, listEnabledTracks, TRACK_COPY } from "@/lib/goal-tracks";

export const metadata = { title: "Choose your goal - VocalisAi" };

export default async function ChooseGoalPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const session = await getServerSession(authOptions);
  const [{ welcome }, tracks, current] = await Promise.all([searchParams, listEnabledTracks(), getUserTrack(session!.user.id)]);
  const firstName = session?.user.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {!welcome && (
        <Link href={current ? "/goal" : "/dashboard"} className="btn-ghost btn-sm -ml-3">
          <Icon as={ArrowLeft} />
          {current ? "Back to my plan" : "Back to dashboard"}
        </Link>
      )}
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">
        {welcome ? `Welcome${firstName ? `, ${firstName}` : ""}! What are you preparing for?` : "What are you preparing for?"}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Pick your goal and we&apos;ll build your plan around it - the skills that matter most, your next steps, and the right exam. You can change it any
        time.
      </p>
      <div className="mt-8">
        <GoalChooser
          current={current?.slug ?? null}
          goals={tracks.map((t) => ({
            slug: t.slug,
            name: t.name,
            tagline: TRACK_COPY[t.slug]?.tagline ?? t.description ?? "",
            includes: TRACK_COPY[t.slug]?.includes ?? [],
          }))}
        />
      </div>
      {welcome && (
        <p className="mt-6 text-sm">
          <Link href="/dashboard" className="text-slate-500 hover:underline">
            Skip for now
          </Link>
        </p>
      )}
    </div>
  );
}
