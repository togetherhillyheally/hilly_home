const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export type SurveyAnswers = Record<string, string | number | null>;

export type SurveySubmission = {
  surveySlug: string;
  answers: SurveyAnswers;
  meta?: Record<string, unknown>;
};

export async function submitSurveyResponse({
  surveySlug,
  answers,
  meta,
}: SurveySubmission): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/survey_responses`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      survey_slug: surveySlug,
      answers,
      meta: meta ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`설문 제출 실패 (${res.status}): ${text || res.statusText}`);
  }
}

export type SurveyResponseRow = {
  id: string;
  survey_slug: string;
  user_id: string | null;
  answers: SurveyAnswers;
  meta: Record<string, unknown> | null;
  submitted_at: string;
};

export async function fetchSurveyResponses(
  slug: string
): Promise<SurveyResponseRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "관리자 조회용 Supabase 환경변수(SUPABASE_SERVICE_ROLE_KEY)가 없습니다."
    );
  }

  const params = new URLSearchParams({
    survey_slug: `eq.${slug}`,
    order: "submitted_at.desc",
    limit: "1000",
  });

  const res = await fetch(`${url}/rest/v1/survey_responses?${params}`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`설문 응답 조회 실패 (${res.status}): ${text}`);
  }

  return (await res.json()) as SurveyResponseRow[];
}
