// Writes docs/MEDIA_INVENTORY.md from src/config/mediaLibrary.ts: every page
// and section, the scene it shows, and that scene's credit.
//   node scripts/media-inventory.mjs
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@/": `${resolve("src").replace(/\\/g, "/")}/` } });
const { LIBRARY, PLACEMENTS } = await jiti.import("../src/config/mediaLibrary.ts");

const AREA = { home: "Home", speaking: "Product: Speaking", interviews: "Product: Interviews", personalised: "Product: Personalised", useCases: "Use cases", pricing: "Pricing", about: "About", contact: "Contact", auth: "Sign in", app: "App pages" };
const rows = Object.entries(PLACEMENTS).flatMap(([key, scenes]) => scenes.map((s, i) => ({ key, i, scene: s, ...LIBRARY[s] })));
const byArea = Object.groupBy(rows, (r) => r.key.split(".")[0]);

let md = `# Media inventory

Generated from \`src/config/mediaLibrary.ts\` by \`node scripts/media-inventory.mjs\`. Do not edit by hand.

**${Object.keys(LIBRARY).length} scenes, ${Object.keys(PLACEMENTS).length} placements. Every scene is used in exactly one place** (checked by \`tests/unit/media-library.test.ts\`, and on the rendered pages at desktop and phone width by \`tests/e2e/media-unique.spec.ts\`). A clip and the still made from it count as one scene.

Licences and credits: all footage and photos are from [Pexels](https://www.pexels.com/license/) (free for commercial use, no attribution required). The Pexels id below finds the original at \`pexels.com/video/<id>\` or \`pexels.com/photo/<id>\`.

`;
for (const [area, list] of Object.entries(byArea)) {
  md += `## ${AREA[area] ?? area}\n\n| Placement | Scene | Type | What it shows | Pexels id |\n| --- | --- | --- | --- | --- |\n`;
  for (const r of list) md += `| \`${r.key}\`${PLACEMENTS[r.key].length > 1 ? ` (${r.i + 1})` : ""} | \`${r.scene}\` | ${r.kind === "clip" ? "Clip" : "Photo"} | ${r.alt} | ${r.pexels} |\n`;
  md += "\n";
}
md += `## Visuals drawn by the app (no photo)

| Where | Visual | Why it's unique |
| --- | --- | --- |
| Dashboard hero, slide 3 | \`HeroDemo\` "dashboard": an example daily plan | Only on the dashboard |
| Mock exams hero, slide 2 | \`HeroDemo\` "examRoom": an example timed section | Only on Mock exams |
| Company & Hiring Assessments hero, slide 2 | \`HeroDemo\` "companyTests": example list of company tests | Only on that category |
| Each company or exam page (\`/explore/<category>/<exam>\`) | \`CatalogPreview\`: its own sections and question counts per level | Built from that test's own content |
| Each skill area (\`/explore/skills/<subject>\`) | \`CatalogPreview\`: its own skills and question counts | Built from that area's own content |
| Each practice mode (\`/practice/<mode>\`) | \`ModePreview\`: what one question in that mode looks like | Built from that mode's own description and type |
| Dashboard "Recommended practice" cards | An icon for the kind of practice | Different icon per kind; no photos |
| Sign up, Forgot password, Reset password | A preview of that step (goal picker, reset email, new password) | One per page |
| Home hero slide "Feedback" | \`AnalysisDemo\` example "interview" | Each page shows a different example |
| Product: Speaking | \`AnalysisDemo\` example "presentation" | |
| About | \`AnalysisDemo\` example "readAloud" | |
| Home: interviews section | \`ConversationDemo\` example "customer" | Each page shows a different example |
| Product: Interviews | \`ConversationDemo\` example "jobInterview" | |
| Home: platform walkthrough | \`WalkthroughDemo\` | Only on the home page |
`;
writeFileSync("docs/MEDIA_INVENTORY.md", md);
console.log("docs/MEDIA_INVENTORY.md:", rows.length, "rows");
