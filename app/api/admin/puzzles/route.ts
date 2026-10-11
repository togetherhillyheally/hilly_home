import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import {
  PUZZLE_GRID_COLS,
  PUZZLE_GRID_PIECES,
  PUZZLE_GRID_ROWS,
} from "@/lib/puzzle-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "puzzle-images";
const MAX_BYTES = 8 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function parseIntInRange(
  raw: FormDataEntryValue | null,
  min: number,
  max: number,
  fallback: number
): number {
  const n = Number(raw);
  if (!Number.isInteger(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseDateIso(raw: FormDataEntryValue | null, endOfDay = false): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  const iso = endOfDay
    ? new Date(`${s}T23:59:59.999`).toISOString()
    : new Date(`${s}T00:00:00`).toISOString();
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "puzzles")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식 (multipart/form-data 필요)" },
      { status: 400 }
    );
  }

  const name = String(form.get("name") ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "퍼즐 이름을 입력해주세요." },
      { status: 400 }
    );
  }
  if (name.length > 100) {
    return NextResponse.json(
      { error: "퍼즐 이름은 100자 이내로 입력해주세요." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "이미지 파일을 첨부해주세요." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일이 너무 커요. (최대 ${Math.round(MAX_BYTES / 1024 / 1024)}MB)` },
      { status: 400 }
    );
  }
  const mime = file.type || "image/jpeg";
  const ext = MIME_EXT[mime];
  if (!ext) {
    return NextResponse.json(
      { error: "지원하지 않는 이미지 형식이에요. (jpg/png/webp)" },
      { status: 400 }
    );
  }

  const description = String(form.get("description") ?? "").trim() || null;
  const reward = String(form.get("reward_description") ?? "").trim() || null;
  const trailIdRaw = String(form.get("trail_id") ?? "").trim();
  const trailId = trailIdRaw || null;
  const seriesName = String(form.get("series_name") ?? "").trim() || null;
  // 트레일·시리즈 상호배타
  const finalTrailId = seriesName ? null : trailId;
  const finalSeries = trailId ? null : seriesName;

  const collabTitle = String(form.get("collab_title") ?? "").trim() || null;
  const collabDescription =
    String(form.get("collab_description") ?? "").trim() || null;

  const baseTier = parseIntInRange(form.get("base_tier"), 1, 5, 1);
  // 격자는 4 × 4 고정 (2026-10-11) — 클라에서 넘어오는 grid_rows/grid_cols 는 무시
  const eventStartsAt = parseDateIso(form.get("event_starts_at"), false);
  const eventEndsAt = parseDateIso(form.get("event_ends_at"), true);

  // 1) puzzles INSERT (image_url 는 이후 PATCH)
  const insertRes = await adminFetch("puzzles?select=id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name,
      description,
      reward_description: reward,
      total_pieces: PUZZLE_GRID_PIECES,
      grid_rows: PUZZLE_GRID_ROWS,
      grid_cols: PUZZLE_GRID_COLS,
      base_tier: baseTier,
      puzzle_type: "mystery",
      trail_id: finalTrailId,
      series_name: finalSeries,
      collab_title: collabTitle,
      collab_description: collabDescription,
      event_starts_at: eventStartsAt,
      event_ends_at: eventEndsAt,
      is_active: true,
    }),
  });
  if (!insertRes.ok) {
    const text = await insertRes.text().catch(() => "");
    return NextResponse.json(
      { error: `퍼즐 생성 실패 (${insertRes.status}): ${text}` },
      { status: 500 }
    );
  }
  const inserted = (await insertRes.json()) as { id: string }[];
  const puzzleId = inserted[0]?.id;
  if (!puzzleId) {
    return NextResponse.json(
      { error: "퍼즐 ID 를 받지 못했어요." },
      { status: 500 }
    );
  }

  // 2) 이미지 업로드 → storage
  const fileName = `puzzle-${puzzleId}-${Date.now()}.${ext}`;
  const buf = new Uint8Array(await file.arrayBuffer());
  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": mime,
        "x-upsert": "true",
      },
      body: new Blob([buf], { type: mime }),
    }
  );
  if (!uploadRes.ok) {
    // INSERT 는 성공했지만 업로드 실패 — 삭제해 롤백 시도
    await adminFetch(`puzzles?id=eq.${puzzleId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    }).catch(() => {});
    const text = await uploadRes.text().catch(() => "");
    return NextResponse.json(
      { error: `이미지 업로드 실패 (${uploadRes.status}): ${text}` },
      { status: 500 }
    );
  }
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;

  // 3) image_url / cover_image_url 반영
  const patchRes = await adminFetch(`puzzles?id=eq.${puzzleId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      image_url: publicUrl,
      cover_image_url: publicUrl,
    }),
  });
  if (!patchRes.ok) {
    // 롤백 (이미지는 남지만 레코드는 지움)
    await adminFetch(`puzzles?id=eq.${puzzleId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    }).catch(() => {});
    return NextResponse.json(
      { error: "이미지 URL 반영 실패" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    puzzle: { id: puzzleId, name, image_url: publicUrl },
  });
}
