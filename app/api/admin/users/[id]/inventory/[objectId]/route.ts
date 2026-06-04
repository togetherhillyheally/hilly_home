import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; objectId: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id, objectId } = await ctx.params;

  const res = await adminFetch(
    `user_basecamp_inventory?user_id=eq.${id}&object_id=eq.${objectId}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "회수 실패" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
