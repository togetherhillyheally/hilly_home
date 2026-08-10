import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORIES = new Set(["trivia", "dadjoke"]);

// 수정 (is_active 토글 또는 내용 편집)
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "quiz-pool")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (body.category !== undefined) {
    const c = String(body.category);
    if (!CATEGORIES.has(c))
      return NextResponse.json({ error: "카테고리 오류" }, { status: 400 });
    update.category = c;
  }
  if (body.question !== undefined) {
    const q = String(body.question).trim();
    if (!q) return NextResponse.json({ error: "질문을 입력해주세요." }, { status: 400 });
    update.question = q;
  }
  if (body.choices !== undefined || body.answer_index !== undefined) {
    const choices = Array.isArray(body.choices)
      ? body.choices.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const answerIndex = Number(body.answer_index);
    if (choices.length < 2 || choices.length > 4)
      return NextResponse.json({ error: "선택지는 2~4개여야 해요." }, { status: 400 });
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length)
      return NextResponse.json({ error: "정답 선택 오류" }, { status: 400 });
    update.choices = choices;
    update.answer_index = answerIndex;
  }

  const res = await adminFetch(`quiz_pool?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "수정에 실패했어요." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// 삭제
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "quiz-pool")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  }
  const res = await adminFetch(`quiz_pool?id=eq.${id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "삭제에 실패했어요." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
