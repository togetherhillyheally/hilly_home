/**
 * 보물지도(map_type='treasure') 공용 상수·타입·검증.
 * BO 편집기와 PATCH 라우트가 같은 규칙을 쓰기 위해 분리.
 */

export const TREASURE_COUNT_MIN = 1;
export const TREASURE_COUNT_MAX = 30;
export const TREASURE_COUNT_PRESETS = [5, 10, 15, 20] as const;

export const TREASURE_REWARD_KINDS = ["seed", "prize", "none"] as const;
export type TreasureRewardKind = (typeof TREASURE_REWARD_KINDS)[number];

/** UI 라벨 매핑 — 셀렉트 옵션에 표시. */
export const TREASURE_REWARD_KIND_LABELS: Record<TreasureRewardKind, string> = {
  seed: "씨앗",
  prize: "상품",
  none: "꽝",
};

export type TreasureReward = {
  kind: TreasureRewardKind;
  value: number;
  label: string;
  weight: number;
};

/** DB DEFAULT 와 동일 — "기본값으로 되돌리기" 버튼이 쓰는 값. */
export const DEFAULT_TREASURE_REWARD_POOL: TreasureReward[] = [
  { kind: "seed", value: 3, label: "씨앗 3개", weight: 5 },
  { kind: "seed", value: 5, label: "씨앗 5개", weight: 3 },
  { kind: "seed", value: 10, label: "씨앗 10개", weight: 1 },
  { kind: "none", value: 0, label: "꽝", weight: 1 },
];

export const DEFAULT_TREASURE_COUNT = 10;

export type TreasureValidationError =
  | { ok: false; code: string; message: string };
export type TreasureValidationOk = { ok: true; value: TreasureReward[] };
export type TreasureValidationResult =
  | TreasureValidationOk
  | TreasureValidationError;

/** reward pool 전체 검증 + 정규화된 배열 반환. */
export function validateTreasureRewardPool(
  input: unknown
): TreasureValidationResult {
  if (!Array.isArray(input)) {
    return { ok: false, code: "not_array", message: "보상 풀은 배열이어야 해요." };
  }
  if (input.length === 0) {
    return { ok: false, code: "empty", message: "보상은 1개 이상 있어야 해요." };
  }
  const normalized: TreasureReward[] = [];
  for (let i = 0; i < input.length; i++) {
    const raw = input[i];
    if (typeof raw !== "object" || raw === null) {
      return {
        ok: false,
        code: "bad_item",
        message: `보상 #${i + 1} 형식이 올바르지 않아요.`,
      };
    }
    const r = raw as Partial<TreasureReward>;
    if (!TREASURE_REWARD_KINDS.includes(r.kind as TreasureRewardKind)) {
      return {
        ok: false,
        code: "bad_kind",
        message: `보상 #${i + 1} 종류는 seed / none 중 하나여야 해요.`,
      };
    }
    const kind = r.kind as TreasureRewardKind;
    const label = typeof r.label === "string" ? r.label.trim() : "";
    if (!label) {
      return {
        ok: false,
        code: "empty_label",
        message: `보상 #${i + 1} 라벨을 입력해주세요.`,
      };
    }
    if (label.length > 20) {
      return {
        ok: false,
        code: "long_label",
        message: `보상 #${i + 1} 라벨은 20자 이내여야 해요.`,
      };
    }
    const weightNum = Number(r.weight);
    if (!Number.isInteger(weightNum) || weightNum < 1) {
      return {
        ok: false,
        code: "bad_weight",
        message: `보상 #${i + 1} 가중치는 1 이상 정수여야 해요.`,
      };
    }
    const valueNum = Number(r.value);
    if (kind === "seed") {
      if (!Number.isInteger(valueNum) || valueNum < 1) {
        return {
          ok: false,
          code: "bad_value",
          message: `보상 #${i + 1} 씨앗 수량은 1 이상 정수여야 해요.`,
        };
      }
    } else if (kind === "prize") {
      // prize 는 수량 개념이 없음 — 값은 항상 0 으로 저장
      if (valueNum !== 0) {
        return {
          ok: false,
          code: "prize_nonzero",
          message: `보상 #${i + 1} 상품은 수량이 0 이어야 해요. (라벨에 자세히 적어주세요)`,
        };
      }
    } else {
      // kind === 'none'
      if (valueNum !== 0) {
        return {
          ok: false,
          code: "none_nonzero",
          message: `보상 #${i + 1} 꽝은 수량이 0 이어야 해요.`,
        };
      }
    }
    normalized.push({ kind, value: valueNum, label, weight: weightNum });
  }
  return { ok: true, value: normalized };
}

export function validateTreasureCount(
  input: unknown
): { ok: true; value: number } | { ok: false; message: string } {
  const n = Number(input);
  if (!Number.isInteger(n)) {
    return { ok: false, message: "보물 개수는 정수여야 해요." };
  }
  if (n < TREASURE_COUNT_MIN || n > TREASURE_COUNT_MAX) {
    return {
      ok: false,
      message: `보물 개수는 ${TREASURE_COUNT_MIN}~${TREASURE_COUNT_MAX} 사이여야 해요.`,
    };
  }
  return { ok: true, value: n };
}

/** 가중치 합. 0 이면 UI 에 안내용. */
export function totalWeight(pool: TreasureReward[]): number {
  return pool.reduce((s, r) => s + (Number(r.weight) || 0), 0);
}
