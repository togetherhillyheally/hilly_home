import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import {
  TRAIL_CHECKPOINT_PHOTOS_BUCKET,
  MAX_PHOTOS_PER_CHECKPOINT,
} from "@/lib/checkpoint-constants";
import { ADMIN_UPLOADER_PROFILE_ID } from "@/lib/trail-upload-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function extOfMime(mime: string): string {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  return "jpg";
}

// GET — 체크포인트의 사진 목록
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ cpId: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { cpId } = await ctx.params;

  const res = await adminFetch(
    `trail_checkpoint_photos?select=id,checkpoint_id,storage_bucket,storage_path,sort_order,file_size_bytes,taken_at,created_at&checkpoint_id=eq.${cpId}&order=sort_order.asc`
  );
  if (!res.ok) return NextResponse.json({ rows: [] });
  const rows = await res.json();
  return NextResponse.json({ rows });
}

// POST — 사진 1장 업로드 + DB row 생성 (FormData: file, taken_at?)
export async function POST(
  req: Request,
  ctx: { params: Promise<{ cpId: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { cpId } = await ctx.params;

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
    return NextResponse.json(
      { error: "사진 파일을 첨부해주세요." },
      { status: 400 }
    );
  }

  const takenAtRaw = form.get("taken_at");
  const takenAt =
    typeof takenAtRaw === "string" && takenAtRaw.trim()
      ? takenAtRaw.trim()
      : null;

  // 1) 현재 사진 개수 확인 + max sort_order
  const listRes = await adminFetch(
    `trail_checkpoint_photos?select=sort_order&checkpoint_id=eq.${cpId}&order=sort_order.desc`
  );
  let nextSort = 1;
  let currentCount = 0;
  if (listRes.ok) {
    const arr = (await listRes.json()) as { sort_order: number | null }[];
    currentCount = arr.length;
    nextSort = (arr[0]?.sort_order ?? 0) + 1;
  }
  if (currentCount >= MAX_PHOTOS_PER_CHECKPOINT) {
    return NextResponse.json(
      {
        error: `사진은 체크포인트당 최대 ${MAX_PHOTOS_PER_CHECKPOINT}장까지 등록할 수 있습니다.`,
      },
      { status: 400 }
    );
  }

  // 2) Storage 업로드
  const photoId = randomUUID();
  const ext = extOfMime(file.type);
  const storagePath = `${ADMIN_UPLOADER_PROFILE_ID}/${cpId}/${photoId}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const upRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${TRAIL_CHECKPOINT_PHOTOS_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": file.type || "image/jpeg",
        "x-upsert": "true",
      },
      body: bytes,
    }
  );
  if (!upRes.ok) {
    const text = await upRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Storage 업로드 실패 (${upRes.status}): ${text}` },
      { status: 500 }
    );
  }

  // 3) DB row 생성
  const row = {
    id: photoId,
    checkpoint_id: cpId,
    author_id: ADMIN_UPLOADER_PROFILE_ID,
    storage_bucket: TRAIL_CHECKPOINT_PHOTOS_BUCKET,
    storage_path: storagePath,
    sort_order: nextSort,
    file_size_bytes: file.size,
    taken_at: takenAt,
  };

  const insRes = await adminFetch(`trail_checkpoint_photos?select=*`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!insRes.ok) {
    const text = await insRes.text().catch(() => "");
    // Storage 정리
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${TRAIL_CHECKPOINT_PHOTOS_BUCKET}/${storagePath}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      }
    ).catch(() => {});
    return NextResponse.json(
      { error: `사진 등록 실패 (${insRes.status}): ${text}` },
      { status: 500 }
    );
  }
  const arr = (await insRes.json()) as Record<string, unknown>[];
  return NextResponse.json({ success: true, row: arr[0] });
}
