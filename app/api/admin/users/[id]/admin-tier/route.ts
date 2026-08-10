import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { ADMIN_TIERS, canManagePermissions } from "@/lib/admin-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!canManagePermissions(session.tier)) {
    return NextResponse.json(
      { error: "권한 관리는 최고 관리자만 할 수 있어요." },
      { status: 403 }
    );
  }

  const { id: targetUserId } = await ctx.params;

  let tier: string | null;
  try {
    const body = await req.json();
    tier = body?.tier === null ? null : String(body?.tier ?? "");
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  if (tier !== null && !ADMIN_TIERS.includes(tier as (typeof ADMIN_TIERS)[number])) {
    return NextResponse.json({ error: "허용되지 않은 등급" }, { status: 400 });
  }

  // 본인의 master 등급 해제 금지 (자가 락아웃 방지)
  if (targetUserId === session.userId && tier !== "master") {
    return NextResponse.json(
      { error: "본인의 master 등급은 변경할 수 없어요." },
      { status: 403 }
    );
  }

  const patchRes = await adminFetch(`profiles?id=eq.${targetUserId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ admin_tier: tier }),
  });
  if (!patchRes.ok) {
    return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
