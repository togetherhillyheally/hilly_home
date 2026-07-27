/**
 * 포인트(스탬프/체크포인트) 퀴즈·반경 필드 검증 — API PATCH 공용.
 *
 * DB CHECK: quiz_question/quiz_choices/quiz_answer_index 는 all-or-none.
 * quiz_choices 는 2~4개 문자열, 모두 non-empty. answerIndex 는 0-base 범위 내.
 * radius_m 은 NULL(=기본 10m) 또는 5~500 정수.
 */

export type QuizFieldsPatch = {
  quiz_question?: string | null;
  quiz_choices?: string[] | null;
  quiz_answer_index?: number | null;
};

const MIN_CHOICES = 2;
const MAX_CHOICES = 4;
const MIN_RADIUS = 5;
const MAX_RADIUS = 500;

/** radius_m 검증 → normalized value or Error message. */
export function normalizeRadius(v: unknown): { ok: true; value: number | null } | { ok: false; error: string } {
  if (v === null) return { ok: true, value: null };
  if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) {
    return { ok: false, error: "도착 반경은 정수로 입력해주세요." };
  }
  if (v < MIN_RADIUS || v > MAX_RADIUS) {
    return { ok: false, error: `도착 반경은 ${MIN_RADIUS}~${MAX_RADIUS}m 범위여야 합니다.` };
  }
  return { ok: true, value: v };
}

/**
 * 세 필드가 모두 들어왔을 때 all-or-none 을 유지한 채 검증.
 * - body 에 셋 중 하나라도 있으면 셋 모두를 처리 (없는 필드는 undefined → null 로 해석)
 * - 셋 다 null 이면 퀴즈 제거
 * - 셋 다 유효한 값이면 퀴즈 등록/수정
 */
export function normalizeQuizAllOrNone(
  body: Record<string, unknown>
):
  | { ok: true; patch: QuizFieldsPatch | null /* null=변경 없음 */ }
  | { ok: false; error: string } {
  const hasAny =
    "quiz_question" in body ||
    "quiz_choices" in body ||
    "quiz_answer_index" in body;
  if (!hasAny) return { ok: true, patch: null };

  const rawQ = body.quiz_question;
  const rawC = body.quiz_choices;
  const rawA = body.quiz_answer_index;

  // 셋 다 명시적 null → 퀴즈 제거
  const allNull = rawQ === null && rawC === null && rawA === null;
  if (allNull) {
    return {
      ok: true,
      patch: { quiz_question: null, quiz_choices: null, quiz_answer_index: null },
    };
  }

  // 질문
  if (typeof rawQ !== "string" || !rawQ.trim()) {
    return { ok: false, error: "질문을 입력해주세요." };
  }
  const question = rawQ.trim();

  // 선택지
  if (!Array.isArray(rawC)) {
    return { ok: false, error: "선택지 배열이 올바르지 않습니다." };
  }
  if (rawC.length < MIN_CHOICES || rawC.length > MAX_CHOICES) {
    return { ok: false, error: `선택지는 ${MIN_CHOICES}~${MAX_CHOICES}개여야 합니다.` };
  }
  const choices: string[] = [];
  for (const c of rawC) {
    if (typeof c !== "string" || !c.trim()) {
      return { ok: false, error: "모든 선택지를 채워주세요." };
    }
    choices.push(c.trim());
  }

  // 정답 인덱스
  if (
    typeof rawA !== "number" ||
    !Number.isInteger(rawA) ||
    rawA < 0 ||
    rawA >= choices.length
  ) {
    return { ok: false, error: "정답 선택지가 올바르지 않습니다." };
  }

  return {
    ok: true,
    patch: {
      quiz_question: question,
      quiz_choices: choices,
      quiz_answer_index: rawA,
    },
  };
}
