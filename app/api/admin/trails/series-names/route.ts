import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "trails")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const res = await adminFetch(
    `trails?select=series_name&series_name=not.is.null&order=series_name.asc`
  );
  if (!res.ok) {
    return NextResponse.json({ names: [] as string[] });
  }
  const rows = (await res.json()) as { series_name: string | null }[];
  const set = new Set<string>();
  for (const r of rows) {
    const v = r.series_name?.trim();
    if (v) set.add(v);
  }
  return NextResponse.json({ names: Array.from(set).sort() });
}
