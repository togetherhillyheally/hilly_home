import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// target_type 별 삭제 대상 테이블 매핑
const DELETE_TABLE: Record<string, string> = {
  basecamp_guestbook: "basecamp_guestbook",
  hiking_session_reviews: "hiking_session_reviews",
  hiking_session_chat_messages: "hiking_session_chat_messages",
};

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;

  // 신고 row 조회
  const rRes = await adminFetch(
    `content_reports?id=eq.${id}&select=target_type,target_id&limit=1`
  );
  if (!rRes.ok) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
  const rows = (await rRes.json()) as Array<{
    target_type: string;
    target_id: string;
  }>;
  const row = rows[0];
  if (!row) {
    return NextResponse.json(
      { error: "신고를 찾을 수 없어요." },
      { status: 404 }
    );
  }

  const table = DELETE_TABLE[row.target_type];
  if (!table) {
    return NextResponse.json(
      { error: `자동 삭제 미지원 타입: ${row.target_type}` },
      { status: 400 }
    );
  }

  // 1) 대상 콘텐츠 삭제
  const delRes = await adminFetch(`${table}?id=eq.${row.target_id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!delRes.ok && delRes.status !== 404) {
    const text = await delRes.text().catch(() => "");
    return NextResponse.json(
      { error: `콘텐츠 삭제 실패: ${text || delRes.status}` },
      { status: 500 }
    );
  }

  // 2) 같은 콘텐츠에 대한 모든 미해결 신고를 resolved 처리
  await adminFetch(
    `content_reports?target_type=eq.${row.target_type}&target_id=eq.${row.target_id}&resolved=eq.false`,
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
