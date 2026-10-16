import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 완주 리워드 신청 처리 — PATCH { status: 'fulfilled'|'requested'|'cancelled', note?: string }
 *  fulfilled → fulfilled_at=now(처음이면), fulfilled_by=관리자, fulfill_note
 *  requested → 되돌리기(fulfilled_at/by null)
 *  cancelled → 취소(사용자가 다시 신청하면 requested 로 복귀)
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "puzzles")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  }

  let body: { status?: string; note?: string | null };
  try {
    body = (await req.json()) as { status?: string; note?: string | null };
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const status = body.status;
  if (status && !["fulfilled", "requested", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "잘못된 상태" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : undefined;

  const cur = await adminFetch(`puzzle_reward_claims?id=eq.${id}&select=id,status,fulfilled_at`);
  if (!cur.ok) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  const rows = (await cur.json()) as Array<{ id: string; status: string; fulfilled_at: string | null }>;
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "신청을 찾을 수 없어요." }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (note !== undefined) patch.fulfill_note = note || null;
  if (status === "fulfilled") {
    patch.status = "fulfilled";
    patch.fulfilled_at = row.fulfilled_at ?? new Date().toISOString();
    patch.fulfilled_by = session.userId;
  } else if (status === "requested" || status === "cancelled") {
    patch.status = status;
    patch.fulfilled_at = null;
    patch.fulfilled_by = null;
  }

  const res = await adminFetch(`puzzle_reward_claims?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return NextResponse.json({ error: `저장 실패: ${t || res.status}` }, { status: 500 });
  }
  const updated = ((await res.json()) as Array<Record<string, unknown>>)[0];
  return NextResponse.json({ success: true, claim: updated });
}
