import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { ADMIN_UPLOADER_PROFILE_ID } from "@/lib/trail-upload-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ORDER_MODES = new Set(["free", "ordered", "random"]);

// POST — 새 스탬프 지도(trail with map_type='stamp') 생성. 포인트는 별도 API로 추가.
export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: {
    name?: string;
    series_name?: string | null;
    stamp_order_mode?: string;
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
    created_by: ADMIN_UPLOADER_PROFILE_ID,
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
