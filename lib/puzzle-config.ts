/**
 * 퍼즐 공용 상수·유틸 — 신규 등록 폼과 상세 편집 폼이 공유.
 * (hilly_rn 과 격자 규칙 동일: 짧은 변 5 고정)
 */

export const DIFFICULTY_TIERS = [
  { tier: 1, label: "쉬움" },
  { tier: 2, label: "보통" },
  { tier: 3, label: "어려움" },
  { tier: 4, label: "아주 어려움" },
  { tier: 5, label: "도전" },
] as const;

/** 난이도별 완성 물병 — 서버 puzzle_tier_bottles 와 동일 (표시용) */
export const TIER_BOTTLES: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 6,
  5: 9,
};

/** 격자 규칙: 짧은 변 5 고정, 긴 변은 이미지 비율(W/H)대로 5~10 */
export function computeGrid(aspect: number): { rows: number; cols: number } {
  const clamp = (n: number) => Math.max(5, Math.min(10, Math.round(n)));
  return aspect >= 1
    ? { rows: 5, cols: clamp(5 * aspect) }
    : { rows: clamp(5 / aspect), cols: 5 };
}

/** ISO → date input 값(YYYY-MM-DD). 로컬 기준 */
export function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
