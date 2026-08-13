import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

async function connectedTrailId(puzzleId: string): Promise<string | null> {
  const res = await adminFetch(
    `puzzles?id=eq.${puzzleId}&select=trail_id`
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ trail_id: string | null }>;
  return rows[0]?.trail_id ?? null;
}

/** GET — 연결된 코스의 콜라보 표시(색/라벨) + 부스트 배율 현황 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (!hasMenuAccess(session, "puzzles")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;

  const trailId = await connectedTrailId(id);
  if (!trailId) return NextResponse.json({ connected: false });

  const res = await adminFetch(
    `trails?id=eq.${trailId}&select=name,piece_color,piece_label,seed_multiplier`
  );
  if (!res.ok)
    return NextResponse.json({ connected: true, trailId });
  const t = (
    (await res.json()) as Array<{
      name: string;
      piece_color: string | null;
      piece_label: string | null;
      seed_multiplier: number | null;
    }>
  )[0];
  return NextResponse.json({
    connected: true,
    trailId,
    trailName: t?.name ?? null,
    pieceColor: t?.piece_color ?? null,
    pieceLabel: t?.piece_label ?? null,
    seedMultiplier: t?.seed_multiplier ?? 1,
  });
}

/** PUT — 연결된 코스의 콜라보 표시 색/라벨 설정 (null 이면 해제) */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (!hasMenuAccess(session, "puzzles")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;

  let body: { pieceColor?: string | null; pieceLabel?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const color =
    body.pieceColor == null || body.pieceColor === ""
      ? null
      : String(body.pieceColor);
  if (color && !HEX_RE.test(color)) {
    return NextResponse.json(
      { error: "색상은 #RRGGBB 형식이어야 해요." },
      { status: 400 }
    );
  }
  const label =
    body.pieceLabel == null ? null : String(body.pieceLabel).trim() || null;

  const trailId = await connectedTrailId(id);
  if (!trailId) {
    return NextResponse.json(
      { error: "먼저 이 퍼즐에 코스를 연결해 주세요." },
      { status: 400 }
    );
  }

  const res = await adminFetch(`trails?id=eq.${trailId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      piece_color: color,
      piece_label: label,
      piece_icon: "default",
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `저장 실패: ${t || res.status}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
