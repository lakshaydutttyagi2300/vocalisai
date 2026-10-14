import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";
import { TicketHandling } from "@/components/practice/TicketHandling";

export const metadata = { title: "Ticket handling - VocalisAi" };

// Handle a support ticket as email and back-office teams do: category,
// priority, reply and internal note, marked by AI. Each marking uses one AI
// ticket review from the plan.
export default function TicketHandlingPage() {
  return (
    <div className="pb-20">
      <MediaHero {...HEROES.goal} eyebrow="Practice" title="Ticket handling" subtitle="Read a support ticket, choose its category and priority, reply to the customer and leave a note for your team. AI marks every part." />
      <div className="page-container mt-10 max-w-3xl">
        <TicketHandling />
      </div>
    </div>
  );
}
