export const BASECAMP_ASSETS_BUCKET = "basecamp-assets";

/**
 * basecamp_objects.category 표준 값 — DB constraint 가 별도로 없어서 자유 입력.
 * UI 자동완성 후보로 활용.
 */
export const COMMON_OBJECT_CATEGORIES = [
  "background",
  "ground",
  "tent",
  "gear",
  "nature",
  "animal",
];

/** category 영문 코드 → 한글 라벨. 매핑이 없으면 원본 그대로 표시. */
export const CATEGORY_LABELS: Record<string, string> = {
  background: "배경",
  ground: "바닥",
  tent: "텐트",
  gear: "장비",
  nature: "자연물",
  animal: "동물",
  // 데이터에서 추가로 자주 보이는 카테고리가 있으면 여기에 추가
};

export function categoryLabel(c: string | null | undefined): string {
  if (!c) return "";
  return CATEGORY_LABELS[c] ?? c;
}

/** basecamp_objects.season 자유 입력. UI 후보. */
export const COMMON_OBJECT_SEASONS = ["spring", "summer", "autumn", "winter"];

export const SEASON_LABELS: Record<string, string> = {
  spring: "봄",
  summer: "여름",
  autumn: "가을",
  winter: "겨울",
};

export function seasonLabel(s: string | null | undefined): string {
  if (!s) return "";
  return SEASON_LABELS[s] ?? s;
}
