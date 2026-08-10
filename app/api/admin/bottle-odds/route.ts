import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OddsInput = { mult: number; weight: number };

/** 보물상자 뽑기 확률 저장 — 서버 RPC(admin_bo_set_treasure_box_odds)가 최종 검증 */
export async function PUT(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "bottle-ledger")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: { odds?: OddsInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const { odds } = body;
  if (!Array.isArray(odds) || odds.length !== 5) {
    return NextResponse.json(
      { error: "배율 5개(x0,x2,x3,x5,x10)의 가중치가 모두 필요해요." },
      { status: 400 }
    );
  }
  for (const o of odds) {
    if (typeof o.mult !== "number" || typeof o.weight !== "number") {
      return NextResponse.json(
        { error: "가중치 값이 올바르지 않아요." },
        { status: 400 }
      );
    }
  }

  const res = await adminFetch("rpc/admin_bo_set_treasure_box_odds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_actor_user_id: session.userId,
      p_odds: odds,
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
