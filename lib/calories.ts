/**
 * 모험 소비 칼로리 추정 (MET 기반) — hilly_rn/utils/calories.ts 와 동일 공식.
 *
 * 표준 공식: kcal = MET × 체중(kg) × 시간(h) + 오르막 보정.
 * 힐리힐리는 심박이 없으므로 아래 신호로 추정:
 *   - 속도(거리÷시간) → 걷기/달리기 강도(MET) 자동 선택
 *   - 누적 상승(고도) → 오르막 수직일 보정
 *   - 체중 → 없으면 기본값(65kg)
 *
 * 정확도: 심박 기반 대비 ±20~30% 오차 자연스러움. UI 는 "약/추정" 표기 권장.
 */

/** 체중 미보유 시 기본 가정 (한국 성인 남녀 중간값 근처) */
export const DEFAULT_BODY_WEIGHT_KG = 65;

/** 오르막 1m 당 수직일 보정 계수 (kcal / kg / m). */
const VERTICAL_KCAL_PER_KG_PER_M = 0.011;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** 걷기·달리기 MET (속도 km/h 기준). */
function footMet(speedKmh: number): number {
  if (speedKmh <= 0) return 0;
  if (speedKmh < 7) return clamp(0.7 * speedKmh + 0.5, 2.0, 6.0);
  return clamp(1.02 * speedKmh, 6.5, 19);
}

export interface CalorieInput {
  distanceKm: number | null | undefined;
  elapsedMinutes: number | null | undefined;
  elevationGainM?: number | null;
  weightKg?: number | null;
}

/** 소비 칼로리(kcal) 추정. 거리·시간 유효하지 않으면 null. 반환값은 반올림된 정수. */
export function estimateCaloriesKcal({
  distanceKm,
  elapsedMinutes,
  elevationGainM,
  weightKg,
}: CalorieInput): number | null {
  const dist = distanceKm ?? 0;
  const min = elapsedMinutes ?? 0;
  if (dist <= 0 || min <= 0) return null;

  const weight =
    weightKg && weightKg > 0 ? weightKg : DEFAULT_BODY_WEIGHT_KG;
  const hours = min / 60;
  const speedKmh = dist / hours;

  const met = footMet(speedKmh);
  const baseKcal = met * weight * hours;
  const ascent = elevationGainM && elevationGainM > 0 ? elevationGainM : 0;
  const verticalKcal = weight * ascent * VERTICAL_KCAL_PER_KG_PER_M;

  const total = Math.round(baseKcal + verticalKcal);
  return total > 0 ? total : null;
}
