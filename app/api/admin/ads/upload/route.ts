import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { AD_IMAGE_BUCKET, adImageUrl } from "@/lib/ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MAX_BYTES = 2 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** 광고 이미지 업로드 — ad-images 버킷(service role). 경로를 돌려주면 폼이 image_path 로 저장한다 */
export async function POST(req: NextRequest) {
  const session = await readAdminSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (!hasMenuAccess(session, "ads")) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "파일이 없어요." }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: "PNG·JPG·WebP·GIF 만 올릴 수 있어요." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "2MB 이하로 올려 주세요." }, { status: 400 });

  const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${AD_IMAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `업로드 실패 (${res.status}): ${text.slice(0, 200)}` }, { status: 500 });
  }
  return NextResponse.json({ path, url: adImageUrl(path) });
}
