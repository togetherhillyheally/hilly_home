import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ORDER_MODES = new Set(["free", "ordered", "random"]);

// POST — 새 ROUTE(trail with map_type='stamp') 생성. 포인트는 별도 API로 추가.
export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "stamps")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: {
    name?: string;
    series_name?: string | null;
    stamp_order_mode?: string;
    points_reveal?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "지도 이름을 입력해주세요." },
      { status: 400 }
    );
  }
  const seriesName =
    typeof body.series_name === "string" && body.series_name.trim()
      ? body.series_name.trim()
      : null;
  const orderMode =
    typeof body.stamp_order_mode === "string" &&
    VALID_ORDER_MODES.has(body.stamp_order_mode)
      ? body.stamp_order_mode
      : "free";

  // sort_order: 기존 max + 1
  const sortRes = await adminFetch(
    `trails?select=sort_order&created_by=not.is.null&order=sort_order.desc&limit=1`
  );
  let nextSort = 1;
  if (sortRes.ok) {
    const arr = (await sortRes.json()) as { sort_order: number | null }[];
    nextSort = (arr[0]?.sort_order ?? 0) + 1;
  }

  const trailId = randomUUID();
  const nowIso = new Date().toISOString();

  const row = {
    id: trailId,
    name,
    series_name: seriesName,
    map_type: "stamp",
    stamp_order_mode: orderMode,
    sort_order: nextSort,
    // 만든 관리자 본인 (2026-11-16) — 고정 관리자 ID 로 넣어 누가 만들어도 한 계정 지도가 됐다
    created_by: session.userId,
    // 기본은 모험 시작 시 공개 — 항상 공개면 시작 전부터 누구에게나 위치·점수가 보인다
    points_reveal: body.points_reveal === "always" ? "always" : "on_start",
    source: "upload",
    is_active: true,
    activity_types: ["walking"],
    created_at: nowIso,
    updated_at: nowIso,
    // 포인트가 들어오면 bounds/center 갱신. 처음엔 null.
  };

  const insRes = await adminFetch(`trails?select=id,name`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!insRes.ok) {
    const text = await insRes.text().catch(() => "");
    return NextResponse.json(
      { error: `생성 실패 (${insRes.status}): ${text}` },
      { status: 500 }
    );
  }
  const arr = (await insRes.json()) as { id: string; name: string }[];
  return NextResponse.json({ success: true, trail: arr[0] });
}
