import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(
  req: Request,
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
  let note: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.note === "string") note = body.note.slice(0, 500);
  } catch {
    // 본문 없어도 OK
  }

  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/account_deletion_requests?id=eq.${id}&status=eq.pending`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "rejected",
        processed_at: new Date().toISOString(),
        processed_by: session.userId,
        note,
      }),
    }
  );
  if (!patchRes.ok) {
    return NextResponse.json(
      { error: "상태 업데이트 실패" },
      { status: 500 }
    );
  }
  const rows = (await patchRes.json()) as Array<{ id: string }>;
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "처리할 수 있는 요청이 없어요. (이미 처리됐을 수 있음)" },
      { status: 409 }
    );
  }
  return NextResponse.json({ success: true });
}
