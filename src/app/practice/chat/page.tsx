import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";
import { ChatSimulation } from "@/components/practice/ChatSimulation";

export const metadata = { title: "Chat simulation - VocalisAi" };

// A live text chat with an AI customer, marked at the end, as chat-process
// hiring rounds test it. Each chat uses one chat simulation from the plan.
export default function ChatSimulationPage() {
  return (
    <div className="pb-20">
      <MediaHero {...HEROES.goal} eyebrow="Practice" title="Chat simulation" subtitle="Handle a live chat with an AI customer who reacts to what you write. Get marked on tone, grammar, correct information, problem solving and reply speed." />
      <div className="page-container mt-10 max-w-3xl">
        <ChatSimulation />
      </div>
    </div>
  );
}
