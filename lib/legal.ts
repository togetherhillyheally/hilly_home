// 법적 문서 (이용약관/개인정보처리방침) — DB legal_documents 에서 SSR fetch.
// content_md 는 markdown. RLS 로 anon SELECT 허용됨.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export type LegalDocument = {
  type: "terms" | "privacy";
  content_md: string;
  effective_date: string;
  updated_at: string;
};

/**
 * 공개 legal_documents 를 anon 키로 조회. 편집 즉시 반영 위해 no-store.
 */
export async function getLegalDocument(
  type: "terms" | "privacy"
): Promise<LegalDocument | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/legal_documents?type=eq.${type}&select=type,content_md,effective_date,updated_at&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as LegalDocument[];
  return rows[0] ?? null;
}
