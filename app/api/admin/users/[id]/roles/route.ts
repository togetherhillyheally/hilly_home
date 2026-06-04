import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set([
  "is_super_admin",
  "is_puzzle_admin",
  "is_host_verified",
  "is_tester",
]);

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const { id: targetUserId } = await ctx.params;

  let field: string;
  let value: boolean;
  try {
    const body = await req.json();
    field = String(body?.field ?? "");
    value = Boolean(body?.value);
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  if (!ALLOWED_FIELDS.has(field)) {
    return NextResponse.json(
      { error: "허용되지 않은 권한 필드" },
      { status: 400 }
    );
  }

  // 본인의 슈퍼어드민 권한 해제 금지 (자가 락아웃 방지)
  if (
    targetUserId === session.userId &&
    field === "is_super_admin" &&
    value === false
  ) {
    return NextResponse.json(
      { error: "본인의 슈퍼어드민 권한은 해제할 수 없어요." },
      { status: 403 }
    );
  }

  const patchRes = await adminFetch(`profiles?id=eq.${targetUserId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ [field]: value }),
  });
  if (!patchRes.ok) {
    return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
