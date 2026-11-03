import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { validateSpotReward, type TreasureSpotReward } from "@/lib/trail-treasure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LatLng = { lat: number; lng: number };

function parseLatLng(v: unknown): LatLng | null {
  const o = v as { lat?: unknown; lng?: unknown } | null;
  if (!o || typeof o.lat !== "number" || typeof o.lng !== "number") return null;
  if (!Number.isFinite(o.lat) || !Number.isFinite(o.lng)) return null;
  if (Math.abs(o.lat) > 90 || Math.abs(o.lng) > 180) return null;
  return { lat: o.lat, lng: o.lng };
}

/**
 * 보물 자리 저장 — 자리 목록을 통째로 바꾼다 (앱 set_trail_treasure_spots 와 같은 규칙, 최대 30).
 * 경로 없는(GPX 없이 만든) 보물지도면 출발점·범위·보물 개수도 함께 맞춘다.
 * body: { start?: {lat,lng}, spots: {lat,lng,reward?}[] } — reward: {kind,value,label} | null(보상 풀 랜덤) (2026-11-03)
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await readAdminSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (!hasMenuAccess(session, "trails")) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "잘못된 지도 ID" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { start?: unknown; spots?: unknown } | null;
  const rawSpots: unknown[] = Array.isArray(body?.spots) ? body.spots : [];
  const spots = rawSpots.map(parseLatLng);
  if (spots.some((s) => !s)) return NextResponse.json({ error: "보물 자리 형식이 올바르지 않아요." }, { status: 400 });
  const rewards: (TreasureSpotReward | null)[] = [];
  for (let i = 0; i < rawSpots.length; i++) {
    const r = validateSpotReward((rawSpots[i] as { reward?: unknown }).reward ?? null, i + 1);
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 });
    rewards.push(r.value);
  }
  if (spots.length > 30) return NextResponse.json({ error: "보물 자리는 30개까지예요." }, { status: 400 });
  const start = body?.start != null ? parseLatLng(body.start) : null;

  const tr = await adminFetch(`trails?select=id,map_type,coordinates&id=eq.${id}`);
  const trail = ((await tr.json().catch(() => [])) as { map_type: string; coordinates: unknown }[])[0];
  if (!trail) return NextResponse.json({ error: "지도를 찾지 못했어요." }, { status: 404 });
  if (trail.map_type !== "treasure") return NextResponse.json({ error: "보물지도가 아니에요." }, { status: 400 });
  const routeless = !Array.isArray(trail.coordinates) || trail.coordinates.length === 0;
  if (routeless && spots.length === 0) {
    return NextResponse.json({ error: "경로 없는 보물지도는 보물 자리가 1개 이상 있어야 해요." }, { status: 400 });
  }
  if (routeless && !start) return NextResponse.json({ error: "출발점이 필요해요." }, { status: 400 });

  const del = await adminFetch(`trail_treasure_spots?trail_id=eq.${id}`, { method: "DELETE" });
  if (!del.ok) return NextResponse.json({ error: `기존 자리 삭제 실패: ${await del.text()}` }, { status: 500 });
  if (spots.length > 0) {
    const ins = await adminFetch("trail_treasure_spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify((spots as LatLng[]).map((s, i) => ({
          trail_id: id,
          seq: i + 1,
          lat: s.lat,
          lng: s.lng,
          reward_kind: rewards[i]?.kind ?? null,
          reward_value: rewards[i]?.value ?? 0,
          reward_label: rewards[i]?.label ?? null,
        }))),
    });
    if (!ins.ok) return NextResponse.json({ error: `보물 자리 저장 실패: ${await ins.text()}` }, { status: 500 });
  }

  if (routeless && start) {
    const pts = [start, ...(spots as LatLng[])];
    const PAD = 0.0015;
    const bounds = {
      minLat: Math.min(...pts.map((p) => p.lat)) - PAD,
      maxLat: Math.max(...pts.map((p) => p.lat)) + PAD,
      minLon: Math.min(...pts.map((p) => p.lng)) - PAD,
      maxLon: Math.max(...pts.map((p) => p.lng)) + PAD,
    };
    const up = await adminFetch(`trails?id=eq.${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_lat: start.lat,
        start_lng: start.lng,
        end_lat: start.lat,
        end_lng: start.lng,
        bounds,
        center: [(bounds.minLon + bounds.maxLon) / 2, (bounds.minLat + bounds.maxLat) / 2],
        treasure_count: spots.length,
      }),
    });
    if (!up.ok) return NextResponse.json({ error: `지도 정보 저장 실패: ${await up.text()}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: spots.length });
}
