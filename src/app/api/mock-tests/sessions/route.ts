import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Uses whichever template was seeded/configured most recently - "allow
  // the test configuration to change the sections" means editing this data,
  // not the code that runs the test.
  const template = await db.mockTestTemplate.findFirst({
    orderBy: { createdAt: "desc" },
    include: { sections: { orderBy: { order: "asc" } } },
  });

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
