import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listMockTestOptions } from "@/lib/mock-test-options";

// The mock tests a signed-in candidate can choose between (see
// src/lib/mock-test-options.ts). With exam runner v2 off this is just the
// default template, so the Mock Tests page looks exactly as before.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ options: await listMockTestOptions() });
}
