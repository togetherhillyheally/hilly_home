// 트레일(지도) 공유 미리보기 (anon 키로 RPC 호출)
// hillyheally.com/t/{trailId} 페이지에서 사용

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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
  // [lng,lat,ele?][] (단일) 또는 [[...]][] (멀티 경로)
  coordinates: number[][] | number[][][] | null;
};

/** 체크포인트 사진 public URL (public 버킷). 없으면 null */
export function trailCoverUrl(p: TrailSharePreview): string | null {
  if (!SUPABASE_URL || !p.cover_bucket || !p.cover_path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${p.cover_bucket}/${p.cover_path}`;
}

// 멀티 경로면 가장 긴 세그먼트 선택, 단일이면 그대로. [lng,lat][] 반환.
function extractLine(coords: TrailSharePreview["coordinates"]): [number, number][] {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  const first = coords[0] as unknown;
  const isMulti = Array.isArray(first) && Array.isArray((first as unknown[])[0]);
  const line: number[][] = isMulti
    ? (coords as number[][][]).reduce((a, b) => (b.length > a.length ? b : a), [])
    : (coords as number[][]);
  return line
    .filter(
      (p) =>
        Array.isArray(p) &&
        p.length >= 2 &&
        typeof p[0] === "number" &&
        typeof p[1] === "number"
    )
    .map((p) => [p[0], p[1]] as [number, number]);
}

// URL 길이 제한 위해 최대 점 수로 균등 샘플링 (첫·끝 보존)
function sampleLine(line: [number, number][], max = 180): [number, number][] {
  if (line.length <= max) return line;
  const step = Math.ceil(line.length / max);
  const out: [number, number][] = [];
  for (let i = 0; i < line.length; i += step) out.push(line[i]);
  const last = line[line.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

// Google polyline 인코딩 (precision 5). 입력 [lng,lat] → lat,lng 순으로 인코딩.
function encodeSigned(value: number): string {
  let val = value < 0 ? ~(value << 1) : value << 1;
  let out = "";
  while (val >= 0x20) {
    out += String.fromCharCode((0x20 | (val & 0x1f)) + 63);
    val >>= 5;
  }
  out += String.fromCharCode(val + 63);
  return out;
}

function encodePolyline(pts: [number, number][]): string {
  let lastLat = 0;
  let lastLng = 0;
  let result = "";
  for (const [lng, lat] of pts) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    result += encodeSigned(latE5 - lastLat);
    result += encodeSigned(lngE5 - lastLng);
    lastLat = latE5;
    lastLng = lngE5;
  }
  return result;
}

/** 맵박스 정적 지도(경로 선) 커버 URL — OG 이미지용. 좌표/토큰 없으면 null */
export function trailMapCoverUrl(p: TrailSharePreview): string | null {
  if (!MAPBOX_TOKEN) return null;
  const line = sampleLine(extractLine(p.coordinates));
  if (line.length < 2) return null;
  const enc = encodeURIComponent(encodePolyline(line));
  const overlay = `path-4+dc2f55-0.9(${enc})`;
  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${overlay}/auto/600x315@2x?padding=40&access_token=${MAPBOX_TOKEN}`;
}

/**
 * 가변 사이즈 Mapbox Static Images URL. BO 공유 카드(정사각형) 등에서 사용.
 * width/height 는 논리 px (Mapbox 가 @2x 로 실제 픽셀 2배 렌더링).
 * 좌표/토큰 없으면 null.
 */
export function buildTrailMapboxStaticUrl(
  coordinates: TrailSharePreview["coordinates"],
  opts?: {
    width?: number;
    height?: number;
    padding?: number;
    /** Mapbox style ID, 기본 outdoors-v12 */
    style?: string;
    /** path 스타일 프리픽스(괄호 앞). 기본 "path-5+dc2f55-0.95" */
    pathStyle?: string;
  }
): string | null {
  if (!MAPBOX_TOKEN) return null;
  const line = sampleLine(extractLine(coordinates));
  if (line.length < 2) return null;
  const enc = encodeURIComponent(encodePolyline(line));
  const pathStyle = opts?.pathStyle ?? "path-5+dc2f55-0.95";
  const overlay = `${pathStyle}(${enc})`;
  const width = opts?.width ?? 600;
  const height = opts?.height ?? 600;
  const padding = opts?.padding ?? 36;
  const style = opts?.style ?? "outdoors-v12";
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/auto/${width}x${height}@2x?padding=${padding}&access_token=${MAPBOX_TOKEN}`;
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
