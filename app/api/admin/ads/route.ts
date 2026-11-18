import { NextRequest, NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { sanitizeAdBody } from "@/lib/ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await readAdminSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (!hasMenuAccess(session, "ads")) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const { error, update } = sanitizeAdBody(body, false);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const res = await adminFetch("ad_campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ ...update, created_by: session.userId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `등록 실패 (${res.status}): ${text.slice(0, 300)}` }, { status: 500 });
  }
  const arr = (await res.json()) as { id: string }[];
  return NextResponse.json({ success: true, row: arr[0] });
}
