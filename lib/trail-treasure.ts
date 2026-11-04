/**
 * 보물지도(map_type='treasure') 공용 상수·타입·검증.
 * BO 편집기와 PATCH 라우트가 같은 규칙을 쓰기 위해 분리.
 *
 * 2026-11-03 보상 풀은 가중치(weight)가 아니라 개수(count) — "이 보상을 상자 몇 개에 넣을지".
 * 세션 시작 시 서버(treasure_pool_deal)가 개수만큼 펼쳐 셔플해 상자에 하나씩 넣고, 배정 안 한 상자는 꽝.
 */

export const TREASURE_COUNT_MIN = 1;
export const TREASURE_COUNT_MAX = 30;
export const TREASURE_COUNT_PRESETS = [5, 10, 15, 20] as const;

export const TREASURE_REWARD_KINDS = ["seed", "prize", "none"] as const;
export type TreasureRewardKind = (typeof TREASURE_REWARD_KINDS)[number];
/** 편집기에서 고르는 종류 — 꽝은 "배정 안 한 상자" 로 자동 */
export const TREASURE_EDIT_KINDS = ["seed", "prize"] as const;

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
  /** 이 보상이 들어갈 상자 수 */
  count: number;
};

export const DEFAULT_TREASURE_COUNT = 10;

/**
 * 상자 수에 맞춘 기본 풀 — 씨앗 10개 ×1(상자 3개 이상), 씨앗 5개 ×30%, 나머지 씨앗 3개. 꽝 없음.
 * DB 컬럼 기본값(상자 10개 기준 6/3/1)과 같은 비율.
 */
export function defaultTreasureRewardPool(boxCount: number): TreasureReward[] {
  const n = Math.max(1, Math.floor(boxCount));
  const big = n >= 3 ? 1 : 0;
  const mid = Math.min(n - big, Math.round(n * 0.3));
  const small = n - big - mid;
  const out: TreasureReward[] = [];
  if (small > 0) out.push({ kind: "seed", value: 3, label: "씨앗 3개", count: small });
  if (mid > 0) out.push({ kind: "seed", value: 5, label: "씨앗 5개", count: mid });
  if (big > 0) out.push({ kind: "seed", value: 10, label: "씨앗 10개", count: big });
  return out;
}

/** DB DEFAULT 와 동일(상자 10개 기준) — 업로드 폼 초기값. */
export const DEFAULT_TREASURE_REWARD_POOL: TreasureReward[] = defaultTreasureRewardPool(DEFAULT_TREASURE_COUNT);

/** DB 에서 읽은 풀을 편집기 형태로 — 옛 형식(weight)은 그 숫자를 개수로, 꽝 줄은 뺀다(남는 상자가 꽝). */
export function normalizeTreasureRewardPool(raw: unknown): TreasureReward[] {
  if (!Array.isArray(raw)) return [];
  const out: TreasureReward[] = [];
  for (const r of raw as Partial<TreasureReward & { weight?: number }>[]) {
    if (!r || typeof r !== "object") continue;
    if (r.kind !== "seed" && r.kind !== "prize") continue;
    const count = Number(r.count ?? r.weight ?? 0);
    out.push({
      kind: r.kind,
      value: r.kind === "seed" ? Number(r.value) || 0 : 0,
      label: typeof r.label === "string" ? r.label : "",
      count: Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0,
    });
  }
  return out;
}

export type TreasureValidationError =
  | { ok: false; code: string; message: string };
export type TreasureValidationOk = { ok: true; value: TreasureReward[] };
export type TreasureValidationResult =
  | TreasureValidationOk
  | TreasureValidationError;

/**
 * reward pool 전체 검증 + 정규화된 배열 반환.
 * boxCount 를 주면 배정 합이 상자 수를 넘지 않는지도 본다.
 */
export function validateTreasureRewardPool(
  input: unknown,
  boxCount?: number
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
    const r = raw as Partial<TreasureReward & { weight?: number }>;
    if (!TREASURE_REWARD_KINDS.includes(r.kind as TreasureRewardKind)) {
      return {
        ok: false,
        code: "bad_kind",
        message: `보상 #${i + 1} 종류는 seed / prize / none 중 하나여야 해요.`,
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
    // 개수 — 옛 저장값(weight)도 개수로 읽는다
    const countNum = Number(r.count ?? r.weight);
    if (!Number.isInteger(countNum) || countNum < 1) {
      return {
        ok: false,
        code: "bad_count",
        message: `보상 #${i + 1} 개수는 1 이상 정수여야 해요.`,
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
    normalized.push({ kind, value: valueNum, label, count: countNum });
  }
  if (boxCount != null) {
    const total = totalCount(normalized);
    if (total > boxCount) {
      return {
        ok: false,
        code: "over_box",
        message: `보상이 ${total}개인데 상자는 ${boxCount}개예요. 개수를 줄여주세요.`,
      };
    }
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

/** 배정된 상자 수 합. */
export function totalCount(pool: TreasureReward[]): number {
  return pool.reduce((s, r) => s + (Number(r.count) || 0), 0);
}

/**
 * 한 사람당 찾을 수 있는 보물 수 (2026-11-03, trails.treasure_per_person_limit).
 * null = 제한 없음. DB 기본값 null (2026-11-04 현장 피드백 — 기본은 제한 없음, 2026-10-30 "한 사람당 1개" 는 폐지).
 */
export const TREASURE_LIMIT_PRESETS = [1, 2, 3] as const;
export const DEFAULT_TREASURE_PER_PERSON_LIMIT: number | null = null;

export function validateTreasureLimit(
  input: unknown
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (input === null || input === undefined || input === "") return { ok: true, value: null };
  const n = Number(input);
  if (!Number.isInteger(n) || n < TREASURE_COUNT_MIN || n > TREASURE_COUNT_MAX) {
    return {
      ok: false,
      message: `한 사람당 개수는 ${TREASURE_COUNT_MIN}~${TREASURE_COUNT_MAX} 사이거나 제한 없음이어야 해요.`,
    };
  }
  return { ok: true, value: n };
}

/**
 * 자리별 보상 (2026-11-03, trail_treasure_spots.reward_*). null = 보상 풀에서 랜덤.
 * DB 체크와 같은 규칙: seed 는 value>=1, prize/none 은 value=0, label 1~20자.
 */
export type TreasureSpotReward = { kind: TreasureRewardKind; value: number; label: string };

export function validateSpotReward(
  input: unknown,
  n: number
): { ok: true; value: TreasureSpotReward | null } | { ok: false; message: string } {
  if (input === null || input === undefined) return { ok: true, value: null };
  const r = input as Partial<TreasureSpotReward>;
  if (!TREASURE_REWARD_KINDS.includes(r.kind as TreasureRewardKind)) {
    return { ok: false, message: `${n}번 보물의 보상 종류가 올바르지 않아요.` };
  }
  const kind = r.kind as TreasureRewardKind;
  const value = kind === "seed" ? Number(r.value) : 0;
  if (kind === "seed" && (!Number.isInteger(value) || value < 1)) {
    return { ok: false, message: `${n}번 보물의 씨앗 수량은 1 이상이어야 해요.` };
  }
  const label =
    (typeof r.label === "string" ? r.label.trim() : "") ||
    (kind === "seed" ? `씨앗 ${value}개` : kind === "none" ? "꽝" : "");
  if (!label) return { ok: false, message: `${n}번 보물의 상품 이름을 적어 주세요.` };
  if (label.length > 20) return { ok: false, message: `${n}번 보물의 상품 이름은 20자까지예요.` };
  return { ok: true, value: { kind, value, label } };
}
