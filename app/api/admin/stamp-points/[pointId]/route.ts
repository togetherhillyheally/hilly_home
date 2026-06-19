import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set(["title", "hint", "lng", "lat", "sort_order"]);

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ pointId: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { pointId } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (k === "title") {
      if (typeof v !== "string" || !v.trim()) {
        return NextResponse.json(
          { error: "제목은 비울 수 없습니다." },
          { status: 400 }
        );
      }
      update.title = v.trim();
    } else if (k === "hint") {
      update.hint = typeof v === "string" && v.trim() ? v.trim() : null;
    } else if (k === "lng" || k === "lat") {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        return NextResponse.json(
          { error: `${k} 값이 올바르지 않습니다.` },
          { status: 400 }
        );
      }
      update[k] = v;
    } else if (k === "sort_order") {
      if (typeof v !== "number" || !Number.isInteger(v)) continue;
      update.sort_order = v;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "변경할 항목이 없습니다." },
      { status: 400 }
    );
  }

  const res = await adminFetch(`stamp_points?id=eq.${pointId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `업데이트 실패 (${res.status}): ${text}` },
      { status: 500 }
    );
  }

  // 좌표가 변경되었으면 트레일 bounds 갱신
  if ("lng" in update || "lat" in update) {
    const r = await adminFetch(
      `stamp_points?select=trail_id&id=eq.${pointId}&limit=1`
    );
    if (r.ok) {
      const arr = (await r.json()) as { trail_id: string }[];
      if (arr[0]) await recomputeTrailBounds(arr[0].trail_id);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ pointId: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { pointId } = await ctx.params;

  // 삭제 전 trail_id 확보 (bounds 재계산용)
  const tRes = await adminFetch(
    `stamp_points?select=trail_id&id=eq.${pointId}&limit=1`
  );
  let trailId: string | null = null;
  if (tRes.ok) {
    const arr = (await tRes.json()) as { trail_id: string }[];
    trailId = arr[0]?.trail_id ?? null;
  }

  const delRes = await adminFetch(`stamp_points?id=eq.${pointId}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!delRes.ok) {
    const text = await delRes.text().catch(() => "");
    return NextResponse.json(
      { error: `삭제 실패 (${delRes.status}): ${text}` },
      { status: 500 }
    );
  }

  if (trailId) await recomputeTrailBounds(trailId);

  return NextResponse.json({ success: true });
}

async function recomputeTrailBounds(trailId: string): Promise<void> {
  const r = await adminFetch(
    `stamp_points?select=lng,lat&trail_id=eq.${trailId}`
  );
  if (!r.ok) return;
  const pts = (await r.json()) as { lng: number; lat: number }[];
  if (pts.length === 0) {
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
