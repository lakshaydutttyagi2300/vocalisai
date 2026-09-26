import { redirect } from "next/navigation";

// "What are you preparing for?" is now the Goal Track chooser and plan
// (Phase 4). Old links to this page land on the goal plan (which asks for a
// goal first if none is chosen yet).
export default function PracticeGoalsPage() {
  redirect("/goal");
}
