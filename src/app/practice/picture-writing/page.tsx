import { MediaHero } from "@/components/ui/MediaHero";
import { HEROES } from "@/config/heroMedia";
import { PictureWriting } from "@/components/practice/PictureWriting";

export const metadata = { title: "Picture writing test - VocalisAi" };

// A timed situational writing task, as some international hiring tests set
// it: describe a real workplace photo in 2 minutes. Each marking uses one AI
// picture-writing review from the plan.
export default function PictureWritingPage() {
  return (
    <div className="pb-20">
      <MediaHero {...HEROES.goal} eyebrow="Practice" title="Picture writing test" subtitle="Study a real workplace photo and describe what is happening in 2 minutes. AI marks your clarity, grammar, interpretation, attention to detail and professionalism." />
      <div id="picture-test" className="page-container mt-10 max-w-5xl scroll-mt-24">
        <PictureWriting />
      </div>
    </div>
  );
}
