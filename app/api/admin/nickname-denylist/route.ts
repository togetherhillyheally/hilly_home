import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MATCH_TYPES = new Set(["exact", "contains"]);

// 차단 항목 추가
export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "nickname-denylist")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: { pattern?: unknown; match_type?: unknown; note?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const pattern = String(body.pattern ?? "").trim();
  const matchType = String(body.match_type ?? "exact");
  const note =
    body.note == null ? null : String(body.note).trim() || null;

  if (!pattern) {
    return NextResponse.json(
      { error: "차단할 문자열을 입력해주세요." },
      { status: 400 }
    );
  }
  if (!MATCH_TYPES.has(matchType)) {
    return NextResponse.json(
      { error: "매칭 타입이 올바르지 않아요." },
      { status: 400 }
    );
  }

  const res = await adminFetch("nickname_denylist", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      pattern,
      match_type: matchType,
      note,
      created_by: session.userId,
    }),
  });
  if (!res.ok) {
    // 유니크 위반이면 안내 문구 분리
    if (res.status === 409) {
      return NextResponse.json(
        { error: "이미 등록된 차단 항목이에요." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "추가에 실패했어요." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
