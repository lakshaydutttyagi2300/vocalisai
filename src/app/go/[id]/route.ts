import { NextResponse } from "next/server";
import { PrismaSocialStore } from "@/lib/social/prisma-store";

// Tracked link used in social posts: counts the click for that post, then
// sends the visitor to the home page with campaign tags. Never fails the visit.
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const to = new URL("/", req.url);
  try {
    if (/^[a-z0-9]{10,40}$/i.test(id)) {
      const store = new PrismaSocialStore();
      const post = await store.getPost(id);
      if (post && post.status === "PUBLISHED") {
        await store.incrementClicks(id);
        to.searchParams.set("utm_source", post.platform);
        to.searchParams.set("utm_medium", "social");
        to.searchParams.set("utm_campaign", "autopilot");
        to.searchParams.set("utm_content", id);
      }
    }
  } catch (err) {
    console.error("Click tracking failed:", err);
  }
  return NextResponse.redirect(to, 302);
}
