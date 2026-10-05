import Link from "next/link";
import { getServerSession } from "next-auth";
import { GoalChooser } from "@/components/goals/GoalChooser";
import { authOptions } from "@/lib/auth";
import { getUserTrack, listEnabledTracks, TRACK_COPY } from "@/lib/goal-tracks";
import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";

export const metadata = { title: "Choose your goal - VocalisAi" };

export default async function ChooseGoalPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const session = await getServerSession(authOptions);
  const [{ welcome }, tracks, current] = await Promise.all([searchParams, listEnabledTracks(), getUserTrack(session!.user.id)]);
  const firstName = session?.user.name?.split(" ")[0];

  return (
    <div className="pb-20">
      <MediaHero {...HEROES.goalChoose} back={welcome ? undefined : { label: current ? "Back to my plan" : "Back to dashboard", href: current ? "/goal" : "/dashboard" }} title={welcome ? `Welcome${firstName ? `, ${firstName}` : ""}! What are you preparing for?` : "What are you preparing for?"} subtitle="Pick your goal and we'll build your plan around it: the skills that matter most, your next steps, and the right exam. You can change it any time." />
    <div className="page-container mt-2">
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
    </div>
  );
}
