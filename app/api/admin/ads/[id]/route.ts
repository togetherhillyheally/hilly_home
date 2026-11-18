import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { AD_IMAGE_BUCKET, sanitizeAdBody } from "@/lib/ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function guard() {
  const session = await readAdminSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (!hasMenuAccess(session, "ads")) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  return null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const { error, update } = sanitizeAdBody(body, true);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "변경할 필드가 없어요." }, { status: 400 });
  }
  const res = await adminFetch(`ad_campaigns?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `업데이트 실패: ${text.slice(0, 300)}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await ctx.params;
  // 이미지도 같이 정리 (버킷 경로일 때만, 실패는 무시)
  const cur = await adminFetch(`ad_campaigns?select=image_path&id=eq.${id}`);
  const rows = cur.ok ? ((await cur.json()) as { image_path: string }[]) : [];
  const res = await adminFetch(`ad_campaigns?id=eq.${id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res.ok) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  const path = rows[0]?.image_path;
  if (path && !/^https?:\/\//i.test(path)) {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${AD_IMAGE_BUCKET}/${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
    }).catch(() => {});
  }
  return NextResponse.json({ success: true });
}
