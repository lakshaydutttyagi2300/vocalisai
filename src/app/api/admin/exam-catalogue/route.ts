import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getCatalogueTree } from "@/lib/exam-catalogue-admin";
import { SCORE_SCALE_KEYS } from "@/lib/score-scales";
import { NAVIGATION_MODES } from "@/lib/exam-catalogue";

// The whole exam catalogue as one tree, plus the option lists the admin
// forms need (registry families not yet created, score scales, navigation
// modes) - so the UI never hard-codes a list the server doesn't accept.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const tree = await getCatalogueTree();
  return NextResponse.json({ ...tree, scoreScales: SCORE_SCALE_KEYS, navigationModes: NAVIGATION_MODES });
}
