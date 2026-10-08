import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";
import { TypingTest } from "@/components/practice/TypingTest";

export const metadata = { title: "Typing test - VocalisAi" };

// Typing speed and accuracy on customer-service text, as chat, email and
// back-office hiring rounds test it. Free on every plan: no AI involved.
export default function TypingTestPage() {
  return (
    <div className="pb-20">
      <MediaHero {...HEROES.goal} eyebrow="Practice" title="Typing test" subtitle="Type a real customer-service email, chat or ticket note. See your speed and accuracy against what employers ask for." />
      <div className="page-container mt-10 max-w-3xl">
        <TypingTest />
      </div>
    </div>
  );
}
