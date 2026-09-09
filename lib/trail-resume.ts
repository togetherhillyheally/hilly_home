/** 동서트레일 이력서 제출·조회 헬퍼. */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export type TrailExperience = {
  period_from: string; // YYYY-MM
  period_to: string | null; // YYYY-MM 또는 null (진행중)
  title: string;
  description: string;
};

export type TrailResumeSubmission = {
  name: string;
  resident_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  trail_experiences: TrailExperience[];
  notes: string | null;
};

export type TrailResumeRow = TrailResumeSubmission & {
  id: string;
  submitted_at: string;
};

/** 브라우저에서 직접 Supabase Storage 로 사진 업로드. 공개 URL 반환. */
export async function uploadResumePhoto(file: File): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase 환경변수 미설정");
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const filename = `${rand}.${ext}`;

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/trail-resume-photos/${filename}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: file,
    }
  );
  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    throw new Error(`사진 업로드 실패 (${uploadRes.status}): ${text}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/trail-resume-photos/${filename}`;
}

/** 이력서 제출 (anon key). */
export async function submitTrailResume(
  data: TrailResumeSubmission
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase 환경변수 미설정");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/trail_resumes`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`이력서 제출 실패 (${res.status}): ${text}`);
  }
}
