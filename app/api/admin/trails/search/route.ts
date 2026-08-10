import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminList, escapeIlike } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrailRow = {
  id: string;
  name: string;
  series_name: string | null;
};

export async function GET(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "trails")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit")) || 12));

  const params = new URLSearchParams({
    select: "id,name,series_name",
    order: "series_name.asc.nullslast,name.asc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set("or", `(name.ilike.*${t}*,series_name.ilike.*${t}*)`);
  }

  const { rows } = await adminList<TrailRow>(`trails?${params.toString()}`, {
    from: 0,
    to: limit - 1,
  });
  return NextResponse.json({ rows });
}
