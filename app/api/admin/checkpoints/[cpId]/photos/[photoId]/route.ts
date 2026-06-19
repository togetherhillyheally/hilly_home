import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// DELETE — 체크포인트 사진 1장 삭제 (Storage + DB)
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ cpId: string; photoId: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { photoId } = await ctx.params;

  // 1) 사진 row 조회
  const r = await adminFetch(
    `trail_checkpoint_photos?select=storage_bucket,storage_path&id=eq.${photoId}`
  );
  if (!r.ok) {
    return NextResponse.json({ error: "사진 조회 실패" }, { status: 500 });
  }
  const arr = (await r.json()) as {
    storage_bucket: string | null;
    storage_path: string | null;
  }[];
  const ph = arr[0];
  if (!ph) {
    return NextResponse.json(
      { error: "사진을 찾을 수 없어요." },
      { status: 404 }
    );
  }

  // 2) Storage 정리
  if (ph.storage_bucket && ph.storage_path) {
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${ph.storage_bucket}/${ph.storage_path}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      }
    ).catch(() => {});
  }

  // 3) DB 정리
  const delRes = await adminFetch(
    `trail_checkpoint_photos?id=eq.${photoId}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    }
  );
  if (!delRes.ok) {
    const text = await delRes.text().catch(() => "");
    return NextResponse.json(
      { error: `삭제 실패 (${delRes.status}): ${text}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
