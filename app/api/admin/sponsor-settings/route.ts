import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 후원 수수료율 · 결제 열기/잠금 — admin_bo_set_sponsor_settings RPC */
export async function PUT(req: Request) {
  const session = await readAdminSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (!hasMenuAccess(session, "sponsorships")) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  let body: { sponsor_fee_rate?: number; sponsor_payments_enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const rate = body.sponsor_fee_rate;
  if (rate !== undefined && (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate >= 1)) {
    return NextResponse.json({ error: "수수료율은 0 이상 1 미만이어야 해요." }, { status: 400 });
  }
  const enabled = body.sponsor_payments_enabled;
  if (enabled !== undefined && typeof enabled !== "boolean") {
    return NextResponse.json({ error: "잘못된 값" }, { status: 400 });
  }
  if (rate === undefined && enabled === undefined) {
    return NextResponse.json({ error: "변경할 값이 없어요." }, { status: 400 });
  }

  const res = await adminFetch("rpc/admin_bo_set_sponsor_settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_actor_user_id: session.userId,
      p_fee_rate: rate ?? null,
      p_payments_enabled: enabled ?? null,
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
