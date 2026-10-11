/**
 * 퍼즐 공용 상수·유틸 — 신규 등록 폼과 상세 편집 폼이 공유.
 * 격자는 전 퍼즐 4 × 4 (16조각) 고정 (2026-10-11).
 * 기존 DB 는 다른 격자(5x7 등)가 있지만 플레이 중 조각 상태 보호를 위해 보존.
 */

export const PUZZLE_GRID_ROWS = 4;
export const PUZZLE_GRID_COLS = 4;
export const PUZZLE_GRID_PIECES = PUZZLE_GRID_ROWS * PUZZLE_GRID_COLS;

/**
 * 난이도 체계 (2026-10-11 재정의, 5종 → 4종):
 *   격자는 4×4 고정, "어려움"은 "필요 씨앗 배율" 로 차등 — trail 연결 퍼즐은
 *   자연스레 N회 완주 느낌, standalone 퍼즐은 N배 많은 씨앗을 모아야 완성.
 *   두 모델에 통일 적용 가능. (실제 분배 트리거 반영은 Phase B)
 */
export const DIFFICULTY_TIERS = [
  { tier: 1, label: "쉬움" },
  { tier: 2, label: "보통" },
  { tier: 3, label: "어려움" },
  { tier: 4, label: "도전" },
] as const;

/** 난이도별 완성 물병 — 서버 puzzle_tier_bottles 와 동일 (표시용) */
export const TIER_BOTTLES: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
};

/**
 * 난이도별 "필요 씨앗 배율" — 완성에 필요한 씨앗 수를 N 배로.
 *   trail 퍼즐: N회 완주 느낌 (1회당 받는 씨앗은 그대로)
 *   standalone 퍼즐: N배 많은 씨앗을 모아야 완성
 */
export const TIER_SEED_MULTIPLIER: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
};

/** ISO → date input 값(YYYY-MM-DD). 로컬 기준 */
export function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
