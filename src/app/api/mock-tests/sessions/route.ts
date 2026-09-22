import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndRecordUsage, upgradeMessage } from "@/lib/entitlements";
import { isFeatureEnabled } from "@/lib/feature-flags";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isFeatureEnabled("MOCK_TEST"))) {
    return NextResponse.json({ error: "Mock tests are currently unavailable." }, { status: 403 });
  }

  const usage = await checkAndRecordUsage(session.user.id, "MOCK_ASSESSMENT");
  if (!usage.allowed) {
    return NextResponse.json({ error: upgradeMessage(usage, "MOCK_ASSESSMENT") }, { status: 403 });
  }

  // Uses whichever template an admin explicitly marked as the default -
  // "allow the test configuration to change the sections" means editing
  // this data, not the code that runs the test. Falls back to the most
  // recently created template only if no default has ever been set
  // (defensive - shouldn't happen once at least one template exists,
  // since creating/setting a default always maintains exactly one).
  const template =
    (await db.mockTestTemplate.findFirst({
      where: { isDefault: true },
      include: { sections: { orderBy: { order: "asc" } } },
    })) ??
    (await db.mockTestTemplate.findFirst({
      orderBy: { createdAt: "desc" },
      include: { sections: { orderBy: { order: "asc" } } },
    }));

  const mockTestSession = await db.mockTestSession.create({
    data: { userId: session.user.id, templateId: template?.id ?? null },
  });

  return NextResponse.json({
    sessionId: mockTestSession.id,
    template: template
      ? { id: template.id, name: template.name, sections: template.sections }
      : null,
  });
}
