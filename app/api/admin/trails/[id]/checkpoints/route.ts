import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { DEFAULT_MARKER_ICON } from "@/lib/checkpoint-constants";
import { ADMIN_UPLOADER_PROFILE_ID } from "@/lib/trail-upload-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — 트레일의 모든 체크포인트 (목록, sort_order 오름차순)
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
    `trail_checkpoints?select=id,trail_id,sort_order,title,lng,lat,note,marker_icon,created_by,created_at,updated_at&trail_id=eq.${id}&order=sort_order.asc`
  );
  if (!res.ok) {
    return NextResponse.json({ rows: [] });
  }
  const rows = await res.json();
  return NextResponse.json({ rows });
}

// POST — 새 체크포인트 생성. lng/lat 필수, title/note/marker_icon 선택
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
    note?: string | null;
    marker_icon?: string;
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

  // sort_order: 기존 max + 1
  const sortRes = await adminFetch(
    `trail_checkpoints?select=sort_order&trail_id=eq.${trailId}&order=sort_order.desc&limit=1`
  );
  let nextSort = 1;
  if (sortRes.ok) {
    const arr = (await sortRes.json()) as { sort_order: number | null }[];
    nextSort = (arr[0]?.sort_order ?? 0) + 1;
  }

  const title = (body.title ?? "").trim() || `체크포인트 ${nextSort}`;
  const note =
    typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const marker_icon =
    typeof body.marker_icon === "string" && body.marker_icon.trim()
      ? body.marker_icon.trim()
      : DEFAULT_MARKER_ICON;

  const cpId = randomUUID();
  const nowIso = new Date().toISOString();

  const row = {
    id: cpId,
    trail_id: trailId,
    sort_order: nextSort,
    title,
    lng: body.lng,
    lat: body.lat,
    note,
    marker_icon,
    created_by: ADMIN_UPLOADER_PROFILE_ID,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const insRes = await adminFetch(`trail_checkpoints?select=*`, {
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
  return NextResponse.json({ success: true, row: arr[0] });
}
