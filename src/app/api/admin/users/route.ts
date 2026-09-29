import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminUsers } from "@/lib/admin-stats";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

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
