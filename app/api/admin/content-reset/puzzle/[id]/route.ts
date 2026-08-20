import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "content-reset")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id: puzzleId } = await ctx.params;
  if (!UUID_RE.test(puzzleId)) {
    return NextResponse.json({ error: "잘못된 퍼즐 id" }, { status: 400 });
  }

  let userIds: string[];
  try {
    const body = await req.json();
    const raw = Array.isArray(body?.user_ids) ? body.user_ids : [];
    userIds = raw.map((v: unknown) => String(v)).filter((v: string) => UUID_RE.test(v));
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  if (userIds.length === 0) {
    return NextResponse.json(
      { error: "초기화할 유저를 1명 이상 선택해주세요." },
      { status: 400 }
    );
  }
  if (userIds.length > 200) {
    return NextResponse.json(
      { error: "한 번에 최대 200명까지 선택 가능해요." },
      { status: 400 }
    );
  }

  const res = await adminFetch("rpc/admin_bo_reset_puzzle_progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_actor_user_id: session.userId,
      p_puzzle_id: puzzleId,
      p_user_ids: userIds,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: text || `초기화 실패 (${res.status})` },
      { status: res.status === 401 || res.status === 403 ? 403 : 400 }
    );
  }

  const resetCount = (await res.json()) as number | null;
  return NextResponse.json({ success: true, reset_count: resetCount });
}
