import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = new Set(["trivia", "dadjoke"]);

// 신규 퀴즈 추가
export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "quiz-pool")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: {
    category?: unknown;
    question?: unknown;
    choices?: unknown;
    answer_index?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const category = String(body.category ?? "trivia");
  const question = String(body.question ?? "").trim();
  const choices = Array.isArray(body.choices)
    ? body.choices.map((c) => String(c).trim()).filter(Boolean)
    : [];
  const answerIndex = Number(body.answer_index);

  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ error: "카테고리가 올바르지 않아요." }, { status: 400 });
  }
  if (!question) {
    return NextResponse.json({ error: "질문을 입력해주세요." }, { status: 400 });
  }
  if (choices.length < 2 || choices.length > 4) {
    return NextResponse.json({ error: "선택지는 2~4개여야 해요." }, { status: 400 });
  }
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
    return NextResponse.json({ error: "정답 선택이 올바르지 않아요." }, { status: 400 });
  }

  const res = await adminFetch("quiz_pool", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ category, question, choices, answer_index: answerIndex }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "추가에 실패했어요." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
