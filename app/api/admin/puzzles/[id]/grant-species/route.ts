import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch, adminList } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 현재 퍼즐 완성 보상으로 지정된 종 id 목록 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  }
  const { rows } = await adminList<{ species_id: string }>(
    `garden_puzzle_rewards?puzzle_id=eq.${id}&select=species_id`,
    { from: 0, to: 999 }
  );
  return NextResponse.json({ species_ids: rows.map((r) => r.species_id) });
}

/** 퍼즐 완성 보상 종 연결 저장 (전체 대체 — 빠진 건 해제) */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  }

  let body: { species_ids?: unknown };
  try {
    body = (await req.json()) as { species_ids?: unknown };
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const list = Array.isArray(body.species_ids) ? body.species_ids : [];
  const uniq = Array.from(new Set(list.map((x) => String(x))));
  for (const sid of uniq) {
    if (!UUID_RE.test(sid)) {
      return NextResponse.json(
        { error: `잘못된 species_id: ${sid}` },
        { status: 400 }
      );
    }
  }
  if (uniq.length > 1) {
    return NextResponse.json(
      { error: "퍼즐당 보상 종은 1종만 연결할 수 있어요." },
      { status: 400 }
    );
  }

  const rpcRes = await adminFetch("rpc/admin_bo_set_puzzle_grant_species", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_actor_user_id: session.userId,
      p_puzzle_id: id,
      p_species_ids: uniq,
    }),
  });
  if (!rpcRes.ok) {
    const text = await rpcRes.text().catch(() => "");
    return NextResponse.json(
      { error: text || `저장 실패 (${rpcRes.status})` },
      { status: rpcRes.status === 401 || rpcRes.status === 403 ? 403 : 400 }
    );
  }
  return NextResponse.json({ success: true, count: uniq.length });
}
