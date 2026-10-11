import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 인증 지점(보물) 도장 그림 — 2026-10-11 "도장 조각"
 *  POST   multipart(file) → puzzle-images 버킷 업로드 + puzzle_treasures.stamp_image_url 갱신
 *  DELETE → stamp_image_url = null (파일은 남겨둠 — 캐시/공유 카드 깨짐 방지)
 * 앱은 이 URL 로 지도 획득 팝업(도장 찍힘), 퍼즐 보드 윤곽/도장 조각/인장, 완성·공유 카드 도장판을 그린다.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "puzzle-images";
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — 도장은 투명 PNG 권장

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

async function guard() {
  const session = await readAdminSession();
  if (!session)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (!hasMenuAccess(session, "puzzles"))
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  return null;
}

async function treasureBelongs(id: string, tid: string): Promise<boolean> {
  const res = await adminFetch(
    `puzzle_treasures?id=eq.${tid}&puzzle_id=eq.${id}&select=id`
  );
  if (!res.ok) return false;
  const rows = (await res.json()) as unknown[];
  return rows.length > 0;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; tid: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { id, tid } = await ctx.params;
  if (!(await treasureBelongs(id, tid))) {
    return NextResponse.json({ error: "보물을 찾을 수 없어요." }, { status: 404 });
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
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "도장 이미지를 첨부해주세요." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일이 너무 커요. (최대 ${Math.round(MAX_BYTES / 1024 / 1024)}MB)` },
      { status: 400 }
    );
  }
  const mime = file.type || "image/png";
  const ext = MIME_EXT[mime];
  if (!ext) {
    return NextResponse.json(
      { error: "지원하지 않는 이미지 형식이에요. (png/webp/jpg)" },
      { status: 400 }
    );
  }

  const fileName = `treasure-stamp-${tid}-${Date.now()}.${ext}`;
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
    const text = await uploadRes.text().catch(() => "");
    return NextResponse.json(
      { error: `업로드 실패: ${text || uploadRes.status}` },
      { status: 500 }
    );
  }
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;

  const patch = await adminFetch(`puzzle_treasures?id=eq.${tid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ stamp_image_url: publicUrl }),
  });
  if (!patch.ok) {
    const t = await patch.text().catch(() => "");
    return NextResponse.json(
      { error: `도장 URL 반영 실패: ${t || patch.status}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ url: publicUrl });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; tid: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { id, tid } = await ctx.params;
  if (!(await treasureBelongs(id, tid))) {
    return NextResponse.json({ error: "보물을 찾을 수 없어요." }, { status: 404 });
  }
  const patch = await adminFetch(`puzzle_treasures?id=eq.${tid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ stamp_image_url: null }),
  });
  if (!patch.ok) {
    const t = await patch.text().catch(() => "");
    return NextResponse.json(
      { error: `도장 해제 실패: ${t || patch.status}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
