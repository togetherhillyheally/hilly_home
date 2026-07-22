import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 모임 정산 완료 처리 — admin_bo_complete_settlement RPC (paid 주문 합계 기준, 멱등) */
export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: { sessionId?: string; memo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId 가 필요합니다." }, { status: 400 });
  }

  const res = await adminFetch("rpc/admin_bo_complete_settlement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_actor_user_id: session.userId,
      p_session_id: body.sessionId,
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
