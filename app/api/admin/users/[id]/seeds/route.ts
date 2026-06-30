import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = {
  currency?: string;
  trail_id?: string | null;
  delta?: number;
  memo?: string | null;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id: targetUserId } = await ctx.params;
  if (!UUID_RE.test(targetUserId)) {
    return NextResponse.json({ error: "잘못된 user_id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const currency = String(body.currency ?? "");
  if (currency !== "seed" && currency !== "campfire") {
    return NextResponse.json(
      { error: "currency 는 'seed' 또는 'campfire' 여야 합니다." },
      { status: 400 }
    );
  }

  const delta = Number(body.delta);
  if (!Number.isInteger(delta) || delta === 0) {
    return NextResponse.json(
      { error: "delta 는 0이 아닌 정수여야 합니다." },
      { status: 400 }
    );
  }
  if (Math.abs(delta) > 1_000_000) {
    return NextResponse.json(
      { error: "delta 절댓값이 너무 큽니다. (최대 1,000,000)" },
      { status: 400 }
    );
  }

  let trailId: string | null = null;
  if (currency === "seed" && body.trail_id) {
    const t = String(body.trail_id);
    if (!UUID_RE.test(t)) {
      return NextResponse.json({ error: "잘못된 trail_id" }, { status: 400 });
    }
    trailId = t;
  }

  const memo = body.memo ? String(body.memo).slice(0, 500) : null;

  const res = await adminFetch("rpc/admin_bo_adjust_balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_actor_user_id: session.userId,
      p_target_user_id: targetUserId,
      p_currency: currency,
      p_trail_id: trailId,
      p_delta: delta,
      p_note: memo,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: text || `지급 실패 (${res.status})` },
      { status: res.status === 401 || res.status === 403 ? 403 : 400 }
    );
  }

  const newBalance = (await res.json()) as number | null;
  return NextResponse.json({ success: true, balance_after: newBalance });
}
