import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminList, escapeIlike } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserHit = {
  id: string;
  nickname: string | null;
  phone_number: string | null;
  email: string | null;
};

/** 기기 배정 대상 검색 — 닉네임·전화·이메일 부분 일치 (최대 10명) */
export async function GET(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "trackers")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ users: [] });

  const t = escapeIlike(q);
  const params = new URLSearchParams({
    select: "id,nickname,phone_number,email",
    or: `(nickname.ilike.*${t}*,phone_number.ilike.*${t}*,email.ilike.*${t}*)`,
    order: "created_at.desc",
    limit: "10",
  });
  const { rows } = await adminList<UserHit>(`profiles?${params.toString()}`);
  return NextResponse.json({ users: rows });
}
