/**
 * 보물찾기 획득자 명단 — 목록 페이지와 CSV 내보내기가 같은 조회 조건을 쓴다 (2026-10-13).
 * 원천: session_treasures(claimed_by IS NOT NULL) + 세션/지도/획득자 임베드.
 */
import { escapeIlike } from "@/lib/admin-rest";

export type ClaimKind = "all" | "prize" | "seed" | "none";

export const KIND_LABELS: Record<ClaimKind, string> = {
  all: "전체",
  prize: "경품",
  seed: "씨앗",
  none: "꽝",
};

export type FulfillStatus = "all" | "pending" | "done";
export const STATUS_LABELS: Record<FulfillStatus, string> = {
  all: "전체",
  pending: "미수령",
  done: "수령 완료",
};

export type ClaimFilters = {
  kind: ClaimKind;
  /** 경품 수령 상태 (경품 외 종류엔 의미 없음) */
  status: FulfillStatus;
  /** 획득자 닉네임/전화 */
  q: string;
  /** 보물 지도(trail) id */
  trail: string;
  /** YYYY-MM-DD (KST 기준 자정~) */
  from: string;
  to: string;
};

export type ClaimRow = {
  id: string;
  seq: number;
  reward_kind: "seed" | "prize" | "none";
  reward_value: number;
  reward_label: string;
  claimed_at: string | null;
  fulfilled_at: string | null;
  fulfill_note: string | null;
  session_id: string;
  hiking_sessions: {
    id: string;
    title: string | null;
    trail_id: string | null;
    started_at: string | null;
    is_solo: boolean | null;
    trails: { name: string | null } | null;
  } | null;
  claimer: {
    id: string;
    nickname: string | null;
    phone_number: string | null;
  } | null;
};

export const CLAIMS_SELECT =
  "id,seq,reward_kind,reward_value,reward_label,claimed_at,fulfilled_at,fulfill_note,session_id," +
  "hiking_sessions!inner(id,title,trail_id,started_at,is_solo,trails(name))," +
  "claimer:profiles!claimed_by!inner(id,nickname,phone_number)";

export function parseClaimFilters(sp: Record<string, string | undefined>): ClaimFilters {
  const kind = (["prize", "seed", "none", "all"].includes(sp.kind ?? "")
    ? sp.kind
    : "prize") as ClaimKind;
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const status = (["pending", "done", "all"].includes(sp.status ?? "")
    ? sp.status
    : "all") as FulfillStatus;
  return {
    kind,
    status,
    q: (sp.q ?? "").trim(),
    trail: /^[0-9a-f-]{36}$/i.test(sp.trail ?? "") ? (sp.trail as string) : "",
    from: day.test(sp.from ?? "") ? (sp.from as string) : "",
    to: day.test(sp.to ?? "") ? (sp.to as string) : "",
  };
}

/** PostgREST 쿼리 파라미터 — 최신 획득 순 */
export function buildClaimsParams(f: ClaimFilters): URLSearchParams {
  const p = new URLSearchParams({
    select: CLAIMS_SELECT,
    order: "claimed_at.desc",
  });
  p.set("claimed_by", "not.is.null");
  if (f.kind !== "all") p.set("reward_kind", `eq.${f.kind}`);
  if (f.status === "pending") p.set("fulfilled_at", "is.null");
  if (f.status === "done") p.set("fulfilled_at", "not.is.null");
  if (f.trail) p.set("hiking_sessions.trail_id", `eq.${f.trail}`);
  if (f.from) p.append("claimed_at", `gte.${f.from}T00:00:00+09:00`);
  if (f.to) p.append("claimed_at", `lt.${nextDay(f.to)}T00:00:00+09:00`);
  if (f.q) {
    const t = escapeIlike(f.q);
    p.set("claimer.or", `(nickname.ilike.*${t}*,phone_number.ilike.*${t}*)`);
  }
  return p;
}

function nextDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function claimsQueryString(f: ClaimFilters, page?: number): string {
  const s = new URLSearchParams();
  if (f.kind !== "prize") s.set("kind", f.kind);
  if (f.status !== "all") s.set("status", f.status);
  if (f.q) s.set("q", f.q);
  if (f.trail) s.set("trail", f.trail);
  if (f.from) s.set("from", f.from);
  if (f.to) s.set("to", f.to);
  if (page && page > 1) s.set("page", String(page));
  return s.toString();
}

export function formatKst(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
