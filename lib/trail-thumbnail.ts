// 트레일 경로 썸네일 생성 요청 — Supabase Edge Function(generate-trail-thumbnail) 호출.
// service role 로 동작하므로 RLS 영향 없음. 비차단(실패해도 업로드/수정은 성공 처리).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/** 트레일 경로 썸네일 생성/갱신 요청. 실패는 삼킨다(썸네일은 부가 기능). */
export async function requestTrailThumbnail(trailId: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/generate-trail-thumbnail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ trailId, mapboxToken: MAPBOX_TOKEN }),
    });
  } catch {
    // 비차단
  }
}
