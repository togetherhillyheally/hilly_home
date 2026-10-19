import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch, escapeIlike } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guard() {
  const session = await readAdminSession();
  if (!session) return { err: NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  if (!hasMenuAccess(session, "puzzles"))
    return { err: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  return { session };
}

type ManagerRow = {
  user_id: string;
  created_at: string;
  profiles: { id: string; nickname: string | null; phone_number: string | null } | null;
};

/** GET — 운영자 목록 (+ ?q= 회원 검색 결과) */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.err) return g.err;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "잘못된 id" }, { status: 400 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  const res = await adminFetch(
    `puzzle_reward_managers?puzzle_id=eq.${id}&select=user_id,created_at,profiles!user_id(id,nickname,phone_number)&order=created_at.asc`
  );
  const managers = res.ok ? ((await res.json()) as ManagerRow[]) : [];

  let candidates: Array<{ id: string; nickname: string | null; phone_number: string | null }> = [];
  if (q.length >= 2) {
    const t = escapeIlike(q);
    const sr = await adminFetch(
      `profiles?or=(nickname.ilike.*${t}*,phone_number.ilike.*${t}*)&select=id,nickname,phone_number&limit=10`
    );
    candidates = sr.ok ? ((await sr.json()) as typeof candidates) : [];
  }
  return NextResponse.json({ managers, candidates });
}

/** POST { user_id } — 운영자 추가 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.err) return g.err;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  let body: { user_id?: string };
  try {
    body = (await req.json()) as { user_id?: string };
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const uid = String(body.user_id ?? "");
  if (!UUID_RE.test(uid)) return NextResponse.json({ error: "잘못된 user_id" }, { status: 400 });

  const res = await adminFetch(`puzzle_reward_managers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal,resolution=ignore-duplicates",
    },
    body: JSON.stringify({ puzzle_id: id, user_id: uid, created_by: g.session!.userId }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return NextResponse.json({ error: `추가 실패: ${t || res.status}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/** DELETE { user_id } — 운영자 제거 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.err) return g.err;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  let body: { user_id?: string };
  try {
    body = (await req.json()) as { user_id?: string };
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const uid = String(body.user_id ?? "");
  if (!UUID_RE.test(uid)) return NextResponse.json({ error: "잘못된 user_id" }, { status: 400 });
  const res = await adminFetch(`puzzle_reward_managers?puzzle_id=eq.${id}&user_id=eq.${uid}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return NextResponse.json({ error: `제거 실패: ${t || res.status}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
