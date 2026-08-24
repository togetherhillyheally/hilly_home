import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — 두 체크포인트 합치기. keepId 유지(위치·제목), removeId 삭제(사진·댓글·씨앗은 keep 으로 이동) */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "stamps")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id: trailId } = await ctx.params;

  let body: { keepId?: string; removeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }
  const keepId = typeof body.keepId === "string" ? body.keepId : "";
  const removeId = typeof body.removeId === "string" ? body.removeId : "";
  if (!keepId || !removeId) {
    return NextResponse.json({ error: "keepId · removeId 가 필요합니다." }, { status: 400 });
  }
  if (keepId === removeId) {
    return NextResponse.json({ error: "같은 지점은 합칠 수 없습니다." }, { status: 400 });
  }

  // 두 체크포인트가 모두 이 트레일 소속인지 검증
  const chkRes = await adminFetch(
    `trail_checkpoints?select=id,trail_id&id=in.(${keepId},${removeId})`
  );
  if (!chkRes.ok) {
    return NextResponse.json({ error: "체크포인트 조회 실패" }, { status: 500 });
  }
  const rows = (await chkRes.json()) as { id: string; trail_id: string }[];
  if (rows.length !== 2 || rows.some((r) => r.trail_id !== trailId)) {
    return NextResponse.json(
      { error: "이 코스의 체크포인트가 아니거나 존재하지 않습니다." },
      { status: 400 }
    );
  }

  // service_role 전용 합치기 RPC 호출
  const rpcRes = await adminFetch(`rpc/admin_merge_trail_checkpoints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_keep: keepId, p_remove: removeId }),
  });
  if (!rpcRes.ok) {
    const text = await rpcRes.text().catch(() => "");
    return NextResponse.json(
      { error: `합치기 실패 (${rpcRes.status}): ${text}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, keepId, removeId });
}
