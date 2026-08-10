import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { MENU_KEYS, canManagePermissions } from "@/lib/admin-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidMenuKey(v: unknown): v is (typeof MENU_KEYS)[number] {
  return typeof v === "string" && (MENU_KEYS as readonly string[]).includes(v);
}

/** override 추가/변경 — 등급 기본값 위에 허용(true) 또는 차단(false)을 얹는다. */
export async function PUT(
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

  let menuKey: unknown;
  let allowed: boolean;
  try {
    const body = await req.json();
    menuKey = body?.menu_key;
    allowed = Boolean(body?.allowed);
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!isValidMenuKey(menuKey)) {
    return NextResponse.json({ error: "허용되지 않은 메뉴" }, { status: 400 });
  }

  const res = await adminFetch(`admin_menu_access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      profile_id: targetUserId,
      menu_key: menuKey,
      allowed,
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/** override 제거 — 등급 기본값으로 되돌린다. */
export async function DELETE(
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
  const menuKey = new URL(req.url).searchParams.get("menu_key");
  if (!isValidMenuKey(menuKey)) {
    return NextResponse.json({ error: "허용되지 않은 메뉴" }, { status: 400 });
  }

  const res = await adminFetch(
    `admin_menu_access?profile_id=eq.${targetUserId}&menu_key=eq.${menuKey}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
