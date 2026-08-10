import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import {
  SCOPABLE_MENU_KEYS,
  canManagePermissions,
} from "@/lib/admin-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidScopableMenuKey(
  v: unknown
): v is (typeof SCOPABLE_MENU_KEYS)[number] {
  return (
    typeof v === "string" &&
    (SCOPABLE_MENU_KEYS as readonly string[]).includes(v)
  );
}

/** 계정이 볼 수 있는 리소스(예: 퍼즐 id)를 스코프에 추가. */
export async function POST(
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
  let resourceId: string;
  try {
    const body = await req.json();
    menuKey = body?.menu_key;
    resourceId = String(body?.resource_id ?? "");
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!isValidScopableMenuKey(menuKey) || !resourceId) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const res = await adminFetch(`admin_menu_scope`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      profile_id: targetUserId,
      menu_key: menuKey,
      resource_id: resourceId,
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "추가 실패" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/** 스코프에서 리소스 제거. */
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
  const url = new URL(req.url);
  const menuKey = url.searchParams.get("menu_key");
  const resourceId = url.searchParams.get("resource_id");
  if (!isValidScopableMenuKey(menuKey) || !resourceId) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const res = await adminFetch(
    `admin_menu_scope?profile_id=eq.${targetUserId}&menu_key=eq.${menuKey}&resource_id=eq.${resourceId}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
