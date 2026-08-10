/**
 * 보물상자 뽑기 확률 — DB(treasure_box_odds) 원천.
 * 배율 집합(x0/x2/x3/x5/x10)은 고정 — 값만 가중치로 조정한다.
 * 계산 로직은 서버 draw_treasure_box RPC 와 동일 유지.
 */

export const TREASURE_BOX_MULTS = [0, 2, 3, 5, 10] as const;

export type BottleOdds = { mult: number; weight: number }[];

/** DB 조회 실패 시 폴백 (서버 시드값과 동일) */
export const DEFAULT_BOTTLE_ODDS: BottleOdds = [
  { mult: 0, weight: 35 },
  { mult: 2, weight: 30 },
  { mult: 3, weight: 20 },
  { mult: 5, weight: 10 },
  { mult: 10, weight: 5 },
];

export function oddsPercent(odds: BottleOdds): { mult: number; pct: number }[] {
  const total = odds.reduce((sum, o) => sum + o.weight, 0);
  if (total <= 0) return odds.map((o) => ({ mult: o.mult, pct: 0 }));
  return odds.map((o) => ({ mult: o.mult, pct: (o.weight / total) * 100 }));
}

export function expectedReturnRate(odds: BottleOdds): number {
  const total = odds.reduce((sum, o) => sum + o.weight, 0);
  if (total <= 0) return 0;
  const weighted = odds.reduce((sum, o) => sum + o.weight * o.mult, 0);
  return weighted / total;
}
