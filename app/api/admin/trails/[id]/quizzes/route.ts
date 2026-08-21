import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuizRow = {
  id: string;
  trail_id: string;
  seq: number;
  lat: number;
  lng: number;
  radius_m: number;
  question: string;
  choices: string[];
  answer_index: number;
  hint: string | null;
  explanation: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

async function guard() {
  const session = await readAdminSession();
  if (!session)
    return { error: NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  if (!hasMenuAccess(session, "trails"))
    return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  return { session };
}

/** 입력 정규화 + 검증 — 성공 시 DB 컬럼 객체, 실패 시 에러 메시지 */
function normalize(body: unknown):
  | { ok: true; row: Omit<QuizRow, "id" | "trail_id" | "seq" | "created_at" | "updated_at"> }
  | { ok: false; msg: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  const question = typeof b.question === "string" ? b.question.trim() : "";
  if (!question) return { ok: false, msg: "질문을 입력해 주세요." };

  const rawChoices = Array.isArray(b.choices) ? b.choices : [];
  const choices = rawChoices
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter((c) => c.length > 0);
  if (choices.length < 2) return { ok: false, msg: "보기를 2개 이상 입력해 주세요." };
  if (choices.length > 6) return { ok: false, msg: "보기는 최대 6개까지예요." };

  const answer_index = Number(b.answer_index);
  if (!Number.isInteger(answer_index) || answer_index < 0 || answer_index >= choices.length)
    return { ok: false, msg: "정답 보기를 올바르게 선택해 주세요." };

  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0))
    return { ok: false, msg: "지도에서 퀴즈 위치를 찍어 주세요." };

  let radius_m = Number(b.radius_m);
  if (!Number.isFinite(radius_m)) radius_m = 25;
  radius_m = Math.min(200, Math.max(5, Math.round(radius_m)));

  const hint =
    typeof b.hint === "string" && b.hint.trim() ? b.hint.trim() : null;
  const explanation =
    typeof b.explanation === "string" && b.explanation.trim()
      ? b.explanation.trim()
      : null;
  const image_url =
    typeof b.image_url === "string" && b.image_url.trim()
      ? b.image_url.trim()
      : null;
  const is_active = b.is_active === undefined ? true : Boolean(b.is_active);

  return {
    ok: true,
    row: { lat, lng, radius_m, question, choices, answer_index, hint, explanation, image_url, is_active },
  };
}

/** GET — 이 코스의 퀴즈 목록(정답 포함, 관리자용) + 지도용 좌표/바운즈 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;
  const { id } = await ctx.params;

  const res = await adminFetch(
    `trail_quizzes?trail_id=eq.${id}&select=id,trail_id,seq,lat,lng,radius_m,question,choices,answer_index,hint,explanation,image_url,is_active,created_at,updated_at&order=seq.asc`
  );
  const quizzes = res.ok ? ((await res.json()) as QuizRow[]) : [];

  const tRes = await adminFetch(
    `trails?id=eq.${id}&select=coordinates,bounds`
  );
  let coordinates: unknown = null;
  let bounds: unknown = null;
  if (tRes.ok) {
    const trow = ((await tRes.json()) as Array<{ coordinates: unknown; bounds: unknown }>)[0];
    coordinates = trow?.coordinates ?? null;
    bounds = trow?.bounds ?? null;
  }

  return NextResponse.json({ quizzes, count: quizzes.length, coordinates, bounds });
}

/** POST — 퀴즈 추가 (seq 는 자동 = 마지막+1) */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const n = normalize(body);
  if (!n.ok) return NextResponse.json({ error: n.msg }, { status: 400 });

  // 다음 seq 계산
  const seqRes = await adminFetch(
    `trail_quizzes?trail_id=eq.${id}&select=seq&order=seq.desc&limit=1`
  );
  const seqRows = seqRes.ok ? ((await seqRes.json()) as Array<{ seq: number }>) : [];
  const nextSeq = (seqRows[0]?.seq ?? -1) + 1;

  const ins = await adminFetch(`trail_quizzes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ ...n.row, trail_id: id, seq: nextSeq }),
  });
  if (!ins.ok) {
    const t = await ins.text().catch(() => "");
    return NextResponse.json({ error: `저장 실패: ${t || ins.status}` }, { status: 500 });
  }
  const created = ((await ins.json()) as QuizRow[])[0];
  return NextResponse.json({ success: true, quiz: created });
}

/** PATCH — 퀴즈 수정 (body.id 로 대상 지정) */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const quizId = typeof body.id === "string" ? body.id : "";
  if (!quizId) return NextResponse.json({ error: "대상 퀴즈가 없어요." }, { status: 400 });

  const n = normalize(body);
  if (!n.ok) return NextResponse.json({ error: n.msg }, { status: 400 });

  const res = await adminFetch(
    `trail_quizzes?id=eq.${quizId}&trail_id=eq.${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ ...n.row, updated_at: new Date().toISOString() }),
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return NextResponse.json({ error: `수정 실패: ${t || res.status}` }, { status: 500 });
  }
  const updated = ((await res.json()) as QuizRow[])[0];
  if (!updated) return NextResponse.json({ error: "대상을 찾을 수 없어요." }, { status: 404 });
  return NextResponse.json({ success: true, quiz: updated });
}

/** DELETE — ?quizId=... 로 단일 삭제 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const quizId = new URL(req.url).searchParams.get("quizId");
  if (!quizId) return NextResponse.json({ error: "대상 퀴즈가 없어요." }, { status: 400 });

  const del = await adminFetch(
    `trail_quizzes?id=eq.${quizId}&trail_id=eq.${id}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } }
  );
  if (!del.ok) {
    const t = await del.text().catch(() => "");
    return NextResponse.json({ error: `삭제 실패: ${t || del.status}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
