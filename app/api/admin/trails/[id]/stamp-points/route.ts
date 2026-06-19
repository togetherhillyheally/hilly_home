import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { parseStampTitle, pickUnusedEntry, stampTitleFromEntry } from "@/lib/stamp-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — 트레일의 모든 스탬프 포인트
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;

  const res = await adminFetch(
    `stamp_points?select=id,trail_id,title,hint,lng,lat,sort_order,created_at&trail_id=eq.${id}&order=sort_order.asc`
  );
  if (!res.ok) return NextResponse.json({ rows: [] });
  return NextResponse.json({ rows: await res.json() });
}

// POST — 새 스탬프 포인트. lng/lat 필수. title 미지정 시 STAMP_POOL 자동 배정.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id: trailId } = await ctx.params;

  let body: {
    lng?: number;
    lat?: number;
    title?: string;
    hint?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  if (
    typeof body.lng !== "number" ||
    !Number.isFinite(body.lng) ||
    typeof body.lat !== "number" ||
    !Number.isFinite(body.lat)
  ) {
    return NextResponse.json(
      { error: "lng/lat 좌표가 필요합니다." },
      { status: 400 }
    );
  }

  // sort_order + 이미 사용된 icon 수집 (자동 배정용)
  const existRes = await adminFetch(
    `stamp_points?select=title,sort_order&trail_id=eq.${trailId}&order=sort_order.desc`
  );
  let nextSort = 1;
  const usedIcons = new Set<string>();
  if (existRes.ok) {
    const arr = (await existRes.json()) as {
      title: string | null;
      sort_order: number | null;
    }[];
    nextSort = (arr[0]?.sort_order ?? 0) + 1;
    for (const r of arr) {
      const { entry } = parseStampTitle(r.title);
      if (entry) usedIcons.add(entry.icon);
    }
  }

  // title 결정: 들어왔으면 그대로(검증), 아니면 풀에서 자동 배정
  let title: string;
  const inputTitle = (body.title ?? "").trim();
  if (inputTitle) {
    // 사용자 입력 — 그대로 사용 (이미 "icon|name" 형식이면 OK, 아니면 plain string)
    title = inputTitle;
  } else {
    const entry = pickUnusedEntry(usedIcons);
    title = stampTitleFromEntry(entry);
  }

  const hint =
    typeof body.hint === "string" && body.hint.trim() ? body.hint.trim() : null;

  const pointId = randomUUID();
  const row = {
    id: pointId,
    trail_id: trailId,
    title,
    hint,
    lng: body.lng,
    lat: body.lat,
    sort_order: nextSort,
  };

  const insRes = await adminFetch(`stamp_points?select=*`, {
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
      { error: `INSERT 실패 (${insRes.status}): ${text}` },
      { status: 500 }
    );
  }
  const arr = (await insRes.json()) as Record<string, unknown>[];

  // trails.bounds/center 갱신 — 새 포인트가 추가되었으니 범위 재계산
  await recomputeTrailBounds(trailId);

  return NextResponse.json({ success: true, row: arr[0] });
}

async function recomputeTrailBounds(trailId: string): Promise<void> {
  const r = await adminFetch(
    `stamp_points?select=lng,lat&trail_id=eq.${trailId}`
  );
  if (!r.ok) return;
  const pts = (await r.json()) as { lng: number; lat: number }[];
  if (pts.length === 0) {
    // 포인트 없으면 bounds/center null 로
    await adminFetch(`trails?id=eq.${trailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ bounds: null, center: null }),
    });
    return;
  }
  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;
  for (const p of pts) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLon) minLon = p.lng;
    if (p.lng > maxLon) maxLon = p.lng;
  }
  const bounds = { minLat, maxLat, minLon, maxLon };
  const center: [number, number] = [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
  await adminFetch(`trails?id=eq.${trailId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ bounds, center }),
  });
}
