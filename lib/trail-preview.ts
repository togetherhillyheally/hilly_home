// 트레일(지도) 공유 미리보기 (anon 키로 RPC 호출)
// hillyheally.com/t/{trailId} 페이지에서 사용

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export type TrailSharePreview = {
  trail_id: string;
  name: string;
  series_name: string | null;
  course_summary: string | null;
  distance_km: number | null;
  total_ascent_m: number | null;
  map_type: "adventure" | "stamp";
  cover_bucket: string | null;
  cover_path: string | null;
};

/** 커버 이미지 public URL (public 버킷). 없으면 null */
export function trailCoverUrl(p: TrailSharePreview): string | null {
  if (!SUPABASE_URL || !p.cover_bucket || !p.cover_path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${p.cover_bucket}/${p.cover_path}`;
}

export async function fetchTrailSharePreview(
  trailId: string
): Promise<TrailSharePreview | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_trail_share_preview`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_trail_id: trailId }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data as TrailSharePreview | null;
}
