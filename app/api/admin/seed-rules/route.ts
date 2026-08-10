import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RuleInput = { upto_km: number | null; seeds_per_km: number };

/** 거리별 씨앗 지급 규칙 저장 — 서버 RPC(admin_bo_set_seed_reward_rules)가 최종 검증 */
export async function PUT(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "ledger")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: {
    rules?: RuleInput[];
    min_guarantee?: number;
    min_distance_km?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const { rules, min_guarantee, min_distance_km } = body;
  if (!Array.isArray(rules) || rules.length === 0) {
    return NextResponse.json(
      { error: "구간 규칙이 비어 있어요." },
      { status: 400 }
    );
  }
  if (
    typeof min_guarantee !== "number" ||
    !Number.isInteger(min_guarantee) ||
    min_guarantee < 0 ||
    typeof min_distance_km !== "number" ||
    min_distance_km < 0
  ) {
    return NextResponse.json(
      { error: "최소 보장/최소 거리 값이 올바르지 않아요." },
      { status: 400 }
    );
  }
  for (const r of rules) {
    if (
      (r.upto_km !== null && typeof r.upto_km !== "number") ||
      typeof r.seeds_per_km !== "number"
    ) {
      return NextResponse.json(
        { error: "구간 값이 올바르지 않아요." },
        { status: 400 }
      );
    }
  }

  const res = await adminFetch("rpc/admin_bo_set_seed_reward_rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_actor_user_id: session.userId,
      p_rules: rules,
      p_min_guarantee: min_guarantee,
      p_min_distance_km: min_distance_km,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Postgres RAISE EXCEPTION 메시지 추출 (예: upto_km must be increasing)
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
