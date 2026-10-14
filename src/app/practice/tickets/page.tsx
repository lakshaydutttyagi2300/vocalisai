import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";
import { SupportDesk } from "@/components/practice/SupportDesk";

export const metadata = { title: "Support desk - VocalisAi" };

// A practice shift on a support desk: a queue of tickets with due times,
// each handled (category, priority, reply, internal note) and marked by AI.
// Each marking uses one AI ticket review from the plan.
export default function SupportDeskPage() {
  return (
    <div className="pb-20">
      <MediaHero {...HEROES.goal} eyebrow="Practice" title="Support desk" subtitle="Work a shift like a real help desk: a queue of customer tickets with due times. Prioritise, reply and leave notes for your team - AI marks every ticket." />
      <div className="page-container mt-10 max-w-5xl">
        <SupportDesk />
      </div>
    </div>
  );
}
