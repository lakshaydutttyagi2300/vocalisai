import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminUsers } from "@/lib/admin-stats";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || undefined;
  const role = searchParams.get("role") || undefined;
  const status = searchParams.get("status");
  const page = Number(searchParams.get("page")) || undefined;
  const pageSize = Number(searchParams.get("pageSize")) || undefined;

  return NextResponse.json(
    await getAdminUsers({
      search,
      role,
      status: status === "active" || status === "suspended" ? status : undefined,
      page,
      pageSize,
    })
  );
}
