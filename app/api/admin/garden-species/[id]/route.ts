import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 정원 종 관리 —
 *  { is_published }            공개 토글
 *  { plant_cost }              재심기 비용 수동 지정 (plant_cost_manual = true)
 *  { recalc_plant_cost: true } 자동값으로 재계산 (manual 해제 후 공식 적용)
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  }

  let body: {
    is_published?: unknown;
    plant_cost?: unknown;
    recalc_plant_cost?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  // 재계산 요청 — manual 해제 후 recalc RPC
  if (body.recalc_plant_cost === true) {
    const unsetRes = await adminFetch(`garden_species?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ plant_cost_manual: false }),
    });
    if (!unsetRes.ok) {
      return NextResponse.json({ error: "재계산 준비 실패" }, { status: 500 });
    }
    const rpcRes = await adminFetch("rpc/admin_bo_recalc_plant_cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_species_ids: [id] }),
    });
    if (!rpcRes.ok) {
      const text = await rpcRes.text().catch(() => "");
      return NextResponse.json(
        { error: text || "재계산 실패" },
        { status: 500 }
      );
    }
    // 갱신된 값 반환
    const getRes = await adminFetch(
      `garden_species?id=eq.${id}&select=plant_cost,plant_cost_manual`
    );
    const rows = getRes.ok
      ? ((await getRes.json()) as Array<{
          plant_cost: number;
          plant_cost_manual: boolean;
        }>)
      : [];
    return NextResponse.json({ success: true, ...rows[0] });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.is_published === "boolean") {
    update.is_published = body.is_published;
  }
  if (body.plant_cost !== undefined) {
    const cost = Number(body.plant_cost);
    if (!Number.isInteger(cost) || cost < 0 || cost > 100_000) {
      return NextResponse.json(
        { error: "plant_cost 는 0~100,000 정수여야 해요." },
        { status: 400 }
      );
    }
    update.plant_cost = cost;
    update.plant_cost_manual = true; // 수동 지정 — 이후 자동 재계산 제외
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "변경할 필드가 없어요." },
      { status: 400 }
    );
  }

  const res = await adminFetch(`garden_species?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `업데이트 실패: ${text || res.status}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
