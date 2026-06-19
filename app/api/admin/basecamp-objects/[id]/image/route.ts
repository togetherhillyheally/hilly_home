import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { BASECAMP_ASSETS_BUCKET } from "@/lib/basecamp-object-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function extOfMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/svg+xml") return "svg";
  return "png";
}

// POST — 이미지 교체. Storage 의 기존 파일을 새 파일로 덮어쓰고,
// storage_path 가 바뀌면 DB 도 갱신.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식 (multipart/form-data 필요)" },
      { status: 400 }
    );
  }

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "이미지 파일을 첨부해주세요." },
      { status: 400 }
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "이미지 파일만 업로드 가능합니다." },
      { status: 400 }
    );
  }

  // 1) 기존 row 조회
  const r = await adminFetch(
    `basecamp_objects?select=category,storage_path&id=eq.${id}`
  );
  if (!r.ok) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
  const arr = (await r.json()) as {
    category: string;
    storage_path: string | null;
  }[];
  const obj = arr[0];
  if (!obj) {
    return NextResponse.json(
      { error: "존재하지 않는 오브젝트입니다." },
      { status: 404 }
    );
  }

  const newExt = extOfMime(file.type);
  const newStoragePath = `${obj.category}/${id}.${newExt}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  // 2) 새 파일 업로드 (upsert)
  const upRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BASECAMP_ASSETS_BUCKET}/${newStoragePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": file.type,
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

  // 3) 기존 path 가 다른 확장자였으면 옛 파일 정리
  if (obj.storage_path && obj.storage_path !== newStoragePath) {
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BASECAMP_ASSETS_BUCKET}/${obj.storage_path}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      }
    ).catch(() => {});
  }

  // 4) DB 의 storage_path 갱신 (확장자 변경 가능성 + cache-bust 용)
  const patchRes = await adminFetch(`basecamp_objects?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ storage_path: newStoragePath }),
  });
  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => "");
    return NextResponse.json(
      { error: `DB 업데이트 실패 (${patchRes.status}): ${text}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    storage_path: newStoragePath,
  });
}
