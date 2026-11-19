import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 후원 정산 완료 처리 — admin_bo_complete_broadcast_settlement RPC (paid 후원 합계 기준, 방송당 1회) */
export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (!hasMenuAccess(session, "sponsorships")) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  let body: { broadcastId?: string; memo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!body.broadcastId) return NextResponse.json({ error: "broadcastId 가 필요합니다." }, { status: 400 });

  const res = await adminFetch("rpc/admin_bo_complete_broadcast_settlement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_actor_user_id: session.userId,
      p_broadcast_id: body.broadcastId,
      p_memo: body.memo ?? null,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = text || String(res.status);
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      /* text 그대로 */
    }
    return NextResponse.json({ error: `정산 실패: ${msg}` }, { status: 500 });
  }
  const result = await res.json().catch(() => null);
  return NextResponse.json({ success: true, result });
}
