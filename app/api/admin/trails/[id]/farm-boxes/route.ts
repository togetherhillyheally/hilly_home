import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 파밍박스(보급 상자) — 지도 표시 전용. 공개 규칙은 스탬프와 동일 (2026-10-23)

async function guard() {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "stamps")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return null;
}

// GET — 이 지도의 파밍박스 목록
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await ctx.params;
  const res = await adminFetch(
    `trail_farm_boxes?select=id,trail_id,title,note,lat,lng,sort_order&trail_id=eq.${id}&order=sort_order.asc`
  );
  if (!res.ok) return NextResponse.json({ rows: [] });
  return NextResponse.json({ rows: await res.json() });
}

// POST — 지도 클릭 위치에 파밍박스 추가. 이름 미지정이면 "파밍박스 N"
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { id: trailId } = await ctx.params;

  let body: { lat?: number; lng?: number; title?: string; note?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }
  if (
    typeof body.lat !== "number" ||
    !Number.isFinite(body.lat) ||
    typeof body.lng !== "number" ||
    !Number.isFinite(body.lng)
  ) {
    return NextResponse.json({ error: "lat/lng 좌표가 필요합니다." }, { status: 400 });
  }

  const existRes = await adminFetch(
    `trail_farm_boxes?select=sort_order&trail_id=eq.${trailId}&order=sort_order.desc&limit=1`
  );
  let nextSort = 1;
  if (existRes.ok) {
    const arr = (await existRes.json()) as { sort_order: number | null }[];
    nextSort = (arr[0]?.sort_order ?? 0) + 1;
  }
  const title = (body.title ?? "").trim() || `파밍박스 ${nextSort}`;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  const insRes = await adminFetch(`trail_farm_boxes?select=*`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ trail_id: trailId, title, note, lat: body.lat, lng: body.lng, sort_order: nextSort }),
  });
  if (!insRes.ok) {
    const text = await insRes.text().catch(() => "");
    return NextResponse.json({ error: `추가 실패 (${insRes.status}): ${text}` }, { status: 500 });
  }
  const arr = (await insRes.json()) as Record<string, unknown>[];
  return NextResponse.json({ success: true, row: arr[0] });
}
