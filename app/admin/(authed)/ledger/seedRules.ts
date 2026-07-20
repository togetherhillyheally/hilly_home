/**
 * 거리별 씨앗 지급 규칙 — DB(garden_seed_reward_rules/settings) 원천.
 * 계산 로직은 서버 calc_garden_seeds / 앱 utils/seedReward.ts 와 동일 유지.
 */

export type SeedRuleTier = { uptoKm: number | null; seedsPerKm: number };

export type SeedRules = {
  tiers: SeedRuleTier[];
  minGuarantee: number;
  minDistanceKm: number;
};

/** DB 조회 실패 시 폴백 (서버 시드값과 동일) */
export const DEFAULT_SEED_RULES: SeedRules = {
  tiers: [
    { uptoKm: 3, seedsPerKm: 4 },
    { uptoKm: 7, seedsPerKm: 3 },
    { uptoKm: 15, seedsPerKm: 2 },
    { uptoKm: null, seedsPerKm: 1 },
  ],
  minGuarantee: 3,
  minDistanceKm: 0.5,
};

export function gardenSeedsForKm(km: number, rules: SeedRules): number {
  if (!(km > 0)) return 0;
  let prev = 0;
  let sum = 0;
  for (const t of rules.tiers) {
    if (t.uptoKm == null) {
      sum += Math.max(0, km - prev) * t.seedsPerKm;
      break;
    }
    sum += Math.max(0, Math.min(km, t.uptoKm) - prev) * t.seedsPerKm;
    prev = t.uptoKm;
    if (km <= t.uptoKm) break;
  }
  const seeds = Math.floor(sum);
  return km >= rules.minDistanceKm
    ? Math.max(rules.minGuarantee, seeds)
    : seeds;
}
