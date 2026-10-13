import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 보물찾기 경품 수령 처리 — PATCH { fulfilled: boolean, note?: string }
 *  fulfilled=true  → fulfilled_at=now, fulfilled_by=관리자, note 저장
 *  fulfilled=false → 전부 null (되돌리기)
 * 메모만 바꾸려면 fulfilled 를 현재 값 그대로 보낸다.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "treasures")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  }

  let body: { fulfilled?: boolean; note?: string | null };
  try {
    body = (await req.json()) as { fulfilled?: boolean; note?: string | null };
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const fulfilled = body.fulfilled === true;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : null;

  // 획득된 보물만 처리 (claimed_by 가 있어야 수령 대상)
  const check = await adminFetch(
    `session_treasures?id=eq.${id}&select=id,claimed_by,fulfilled_at`
  );
  if (!check.ok) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
  const rows = (await check.json()) as Array<{
    id: string;
    claimed_by: string | null;
    fulfilled_at: string | null;
  }>;
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "보물을 찾을 수 없어요." }, { status: 404 });
  }
  if (!row.claimed_by) {
    return NextResponse.json(
      { error: "아직 획득되지 않은 보물이에요." },
      { status: 400 }
    );
  }

  const patch = fulfilled
    ? {
        // 이미 완료된 건 시각 유지(메모만 갱신), 새로 완료면 now
        fulfilled_at: row.fulfilled_at ?? new Date().toISOString(),
        fulfilled_by: session.userId,
        fulfill_note: note,
      }
    : { fulfilled_at: null, fulfilled_by: null, fulfill_note: note };

  const res = await adminFetch(`session_treasures?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `저장 실패: ${t || res.status}` },
      { status: 500 }
    );
  }
  const updated = ((await res.json()) as Array<{
    fulfilled_at: string | null;
    fulfill_note: string | null;
  }>)[0];
  return NextResponse.json({
    success: true,
    fulfilled_at: updated?.fulfilled_at ?? null,
    fulfill_note: updated?.fulfill_note ?? null,
  });
}
