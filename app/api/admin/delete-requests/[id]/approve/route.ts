import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
  }

  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }
  if (!hasMenuAccess(session, "delete-requests")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await ctx.params;

  // 1) 요청 row 조회
  const fetchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/account_deletion_requests?id=eq.${id}&select=id,user_id,status&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    }
  );
  const rows = fetchRes.ok
    ? ((await fetchRes.json()) as Array<{
        id: string;
        user_id: string | null;
        status: string;
      }>)
    : [];
  const row = rows[0];
  if (!row) {
    return NextResponse.json(
      { error: "요청을 찾을 수 없어요." },
      { status: 404 }
    );
  }
  if (row.status !== "pending") {
    return NextResponse.json(
      { error: `이미 처리된 요청이에요. (${row.status})` },
      { status: 409 }
    );
  }

  // 2) Supabase Auth user 삭제 (profiles 등은 CASCADE)
  if (row.user_id) {
    const delRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${row.user_id}`,
      {
        method: "DELETE",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    // 404 (이미 없음) 는 무시하고 진행
    if (!delRes.ok && delRes.status !== 404) {
      const text = await delRes.text().catch(() => "");
      return NextResponse.json(
        { error: `계정 삭제 실패: ${text || delRes.status}` },
        { status: 500 }
      );
    }
  }

  // 3) 요청 status 업데이트
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/account_deletion_requests?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "processed",
        processed_at: new Date().toISOString(),
        processed_by: session.userId,
      }),
    }
  );
  if (!patchRes.ok) {
    return NextResponse.json(
      { error: "상태 업데이트 실패" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
