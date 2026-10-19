import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { logAdminAction } from "@/lib/audit-log";
import { approvePost, emergencyStop, markPublished, rejectPost, resume, setMode } from "@/lib/social/actions";
import { configSchema, saveConfig } from "@/lib/social/config";
import { buildContext } from "@/lib/social/context";
import { tick } from "@/lib/social/orchestrator";
import { PrismaSocialStore } from "@/lib/social/prisma-store";
import { socialStatus } from "@/lib/social/status";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    return NextResponse.json(await socialStatus(new PrismaSocialStore()), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Social status failed:", err);
    return NextResponse.json({ error: "Couldn't load the autopilot status." }, { status: 500 });
  }
}

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setMode"), mode: z.enum(["draft", "supervised", "autopilot"]) }),
  z.object({ action: z.literal("stop") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("approve"), postId: z.string().min(1) }),
  z.object({ action: z.literal("reject"), postId: z.string().min(1), reason: z.string().max(300).default("") }),
  z.object({ action: z.literal("markPublished"), postId: z.string().min(1), url: z.string().max(500).nullable().default(null) }),
  z.object({ action: z.literal("runNow") }),
  z.object({ action: z.literal("saveSettings"), settings: configSchema.pick({ platforms: true, postsPerDay: true, planDaysAhead: true, slotsIst: true, maxAiCallsPerDay: true, siteUrl: true }).partial() }),
]);

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That request wasn't understood." }, { status: 400 });
  const a = parsed.data;
  const store = new PrismaSocialStore();
  const who = admin.adminEmail;
  let result: { ok: boolean; message?: string; error?: string };
  switch (a.action) {
    case "setMode": result = await setMode(store, a.mode); break;
    case "stop": result = await emergencyStop(store); break;
    case "resume": result = await resume(store); break;
    case "approve": result = await approvePost(store, a.postId, who); break;
    case "reject": result = await rejectPost(store, a.postId, who, a.reason); break;
    case "markPublished": result = await markPublished(store, a.postId, who, a.url); break;
    case "saveSettings": await saveConfig(store, a.settings); result = { ok: true, message: "Settings saved." }; break;
    case "runNow": {
      const s = await tick(await buildContext(), "panel");
      result = { ok: true, message: `Ran ${s.processed} task(s): ${s.ok} done, ${s.failed} failed, ${s.blocked} waiting.` };
      break;
    }
  }
  if (a.action !== "runNow") {
    await logAdminAction({ adminId: admin.adminId, adminEmail: admin.adminEmail, action: `SOCIAL_${a.action.toUpperCase()}`, targetType: "SocialAutopilot", targetId: "postId" in a ? a.postId : undefined, after: a.action === "saveSettings" ? a.settings : { ok: result.ok } });
  }
  return result.ok ? NextResponse.json(result) : NextResponse.json({ error: result.error }, { status: 409 });
}
