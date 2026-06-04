import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;

  // 1) 메시지 삭제
  const delRes = await adminFetch(`basecamp_guestbook?id=eq.${id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!delRes.ok) {
    return NextResponse.json(
      { error: "메시지 삭제 실패" },
      { status: 500 }
    );
  }

  // 2) 해당 메시지에 대한 미해결 신고 자동 처리
  await adminFetch(
    `content_reports?target_type=eq.basecamp_guestbook&target_id=eq.${id}&resolved=eq.false`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        resolved: true,
        resolved_at: new Date().toISOString(),
      }),
    }
  ).catch(() => {});

  return NextResponse.json({ success: true });
}
