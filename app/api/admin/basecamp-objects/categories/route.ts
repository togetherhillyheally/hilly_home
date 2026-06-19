import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { COMMON_OBJECT_CATEGORIES } from "@/lib/basecamp-object-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — basecamp_objects.category distinct + 표준 후보 머지
export async function GET() {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const res = await adminFetch(
    `basecamp_objects?select=category&order=category.asc`
  );
  const set = new Set<string>(COMMON_OBJECT_CATEGORIES);
  if (res.ok) {
    const rows = (await res.json()) as { category: string | null }[];
    for (const r of rows) {
      if (r.category && r.category.trim()) set.add(r.category.trim());
    }
  }
  return NextResponse.json({ names: Array.from(set).sort() });
}
