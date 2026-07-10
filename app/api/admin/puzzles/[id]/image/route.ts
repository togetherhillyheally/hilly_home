import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "puzzle-images";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

  const fileName = `puzzle-${id}-${Date.now()}.${ext}`;
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

  // puzzles.image_url / cover_image_url 즉시 갱신
  const patchRes = await adminFetch(`puzzles?id=eq.${id}`, {
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
    return NextResponse.json(
      { error: "이미지 URL 반영 실패" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: publicUrl });
}
