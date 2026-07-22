import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 플랫폼 수수료율 변경 — admin_bo_set_payment_settings RPC */
export async function PUT(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: { session_fee_rate?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const rate = body.session_fee_rate;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate >= 1) {
    return NextResponse.json(
      { error: "수수료율은 0 이상 1 미만이어야 해요." },
      { status: 400 }
    );
  }

  const res = await adminFetch("rpc/admin_bo_set_payment_settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_actor_user_id: session.userId,
      p_session_fee_rate: rate,
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
    return NextResponse.json({ error: `저장 실패: ${msg}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
