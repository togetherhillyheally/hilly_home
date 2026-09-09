import { NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 설문 마감 상태 토글 (upsert). 별도 인증 대신 SURVEY_ADMIN_KEY 를 헤더 or 쿼리로 요구.
 * (설문 어드민 페이지 자체가 이 키로 접근하는 흐름이라 동일 키 재사용.)
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const adminKey = process.env.SURVEY_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { error: "SURVEY_ADMIN_KEY 미설정" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const providedKey =
    req.headers.get("x-survey-admin-key") ?? url.searchParams.get("key") ?? "";
  if (providedKey !== adminKey) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }

  const { slug } = await ctx.params;

  let body: { is_closed?: unknown; closed_reason?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const isClosed = Boolean(body.is_closed);
  const closedReason =
    body.closed_reason == null || body.closed_reason === ""
      ? null
      : String(body.closed_reason).slice(0, 200);

  const payload = {
    survey_slug: slug,
    is_closed: isClosed,
    closed_at: isClosed ? new Date().toISOString() : null,
    closed_reason: isClosed ? closedReason : null,
    updated_at: new Date().toISOString(),
  };

  const res = await adminFetch(
    `survey_status?on_conflict=survey_slug`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `상태 저장 실패: ${text || res.status}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true, is_closed: isClosed });
}
