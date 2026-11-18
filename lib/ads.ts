// 라이브 중계 광고 — map.hillyheally.com 관전/중계 페이지의 배너 자리 3곳 (hilly_rn 20261119000002_ads.sql)

export const AD_PLACEMENTS = [
  {
    value: "sheet_header",
    label: "시트 머리",
    hint: "지도 아래 패널 맨 위. 가로 3:1 (예 1200×400)",
  },
  {
    value: "chat_inline",
    label: "채팅 사이",
    hint: "채팅 15개마다 한 번. 가로 4:1 (예 1200×300)",
  },
  {
    value: "finish_banner",
    label: "종료 배너 아래",
    hint: "레이스 종료·중계 종료 화면. 가로 4:1 (예 1200×300)",
  },
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number]["value"];

export const AD_KINDS = [
  { value: "tracker_event", label: "트래커 이벤트(레이스 관전)" },
  { value: "hiking_session", label: "개인 도전 중계" },
] as const;

export type AdCampaignRow = {
  id: string;
  name: string;
  advertiser: string | null;
  image_path: string;
  link_url: string | null;
  alt_text: string | null;
  placement: AdPlacement;
  weight: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  target_kinds: string[] | null;
  broadcast_id: string | null;
  created_at: string;
  updated_at: string;
};

export const AD_IMAGE_BUCKET = "ad-images";

export function placementLabel(p: string): string {
  return AD_PLACEMENTS.find((x) => x.value === p)?.label ?? p;
}

/** 버킷 경로 → 공개 URL (외부 절대 URL 이면 그대로) */
export function adImageUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AD_IMAGE_BUCKET}/${path}`;
}

const PLACEMENT_SET = new Set<string>(AD_PLACEMENTS.map((p) => p.value));
const KIND_SET = new Set<string>(AD_KINDS.map((k) => k.value));

/** API 본문 검증 — 등록/수정 공용 (route.ts 는 HTTP 메서드 외 export 가 안 돼 여기 둔다). 잘못되면 error */
export function sanitizeAdBody(
  b: Record<string, unknown>,
  partial: boolean
): { error?: string; update: Record<string, unknown> } {
  const u: Record<string, unknown> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
  if (has("name") || !partial) {
    const v = String(b.name ?? "").trim();
    if (!v || v.length > 80) return { error: "광고 이름은 1~80자예요.", update: u };
    u.name = v;
  }
  if (has("image_path") || !partial) {
    const v = String(b.image_path ?? "").trim();
    if (!v) return { error: "이미지가 필요해요.", update: u };
    u.image_path = v;
  }
  if (has("placement") || !partial) {
    const v = String(b.placement ?? "");
    if (!PLACEMENT_SET.has(v)) return { error: "자리 값이 올바르지 않아요.", update: u };
    u.placement = v;
  }
  if (has("advertiser")) u.advertiser = b.advertiser ? String(b.advertiser).trim().slice(0, 60) : null;
  if (has("alt_text")) u.alt_text = b.alt_text ? String(b.alt_text).trim().slice(0, 200) : null;
  if (has("link_url")) {
    const v = b.link_url ? String(b.link_url).trim() : "";
    if (v && !/^https?:\/\//i.test(v)) return { error: "링크는 http(s):// 로 시작해야 해요.", update: u };
    u.link_url = v || null;
  }
  if (has("weight")) {
    const n = Number(b.weight);
    if (!Number.isFinite(n) || n < 1 || n > 100) return { error: "가중치는 1~100이에요.", update: u };
    u.weight = Math.round(n);
  }
  if (has("starts_at")) u.starts_at = b.starts_at ? new Date(String(b.starts_at)).toISOString() : null;
  if (has("ends_at")) u.ends_at = b.ends_at ? new Date(String(b.ends_at)).toISOString() : null;
  if (has("is_active")) u.is_active = !!b.is_active;
  if (has("target_kinds")) {
    const arr = Array.isArray(b.target_kinds) ? b.target_kinds.map(String).filter((k) => KIND_SET.has(k)) : [];
    u.target_kinds = arr.length > 0 ? arr : null;
  }
  if (has("broadcast_id")) u.broadcast_id = b.broadcast_id ? String(b.broadcast_id) : null;
  return { update: u };
}

/** 지금 노출 중인지 — 활성 + 기간 안 */
export function adIsLive(row: AdCampaignRow, now = Date.now()): boolean {
  if (!row.is_active) return false;
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return false;
  if (row.ends_at && new Date(row.ends_at).getTime() <= now) return false;
  return true;
}
