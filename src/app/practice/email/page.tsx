import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";
import { EmailWriting } from "@/components/practice/EmailWriting";

export const metadata = { title: "Email writing - VocalisAi" };

// Reply to a customer email and get it marked by AI, as chat and email
// support hiring rounds test it. Each marking uses one AI email review.
export default function EmailWritingPage() {
  return (
    <div className="pb-20">
      <MediaHero {...HEROES.goal} eyebrow="Practice" title="Email writing" subtitle="Reply to a real-looking customer email. AI marks your tone, structure, grammar and whether you solved the problem, and shows a model reply." />
      <div className="page-container mt-10 max-w-3xl">
        <EmailWriting />
      </div>
    </div>
  );
}
