"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shuffle,
  Users,
  X,
} from "lucide-react";
import type { EventConfig } from "@/lib/event-catalog";

export type SignupRow = {
  id: string;
  order_id: string;
  /** 보여주는 신청번호 (ROUTE-GG-001) — 결제 확정 때 부여 */
  signup_code: string | null;
  user_id: string | null;
  name: string;
  phone: string;
  email: string;
  birth: string;
  gender: string;
  emergency_name: string;
  emergency_relation: string | null;
  emergency_phone: string;
  experience: string | null;
  note: string | null;
  agree_photo: boolean;
  amount: number;
  order_total: number | null;
  party_size: number;
  is_leader: boolean;
  status: string;
  paid_at: string | null;
  canceled_at: string | null;
  created_at: string;
  team_no: number | null;
  squad: string | null;
  /** 대장만 기입 — "도전파 — …" 형식 */
  play_style: string | null;
  /** 뒤풀이 식사 참석 (참가자별) */
  dinner: boolean | null;
  metadata: {
    method?: string;
    receipt?: string;
    /** 플레이 방식 — pair: 둘이 신청, solo: 개인전, match: 짝꿍 매칭 희망 */
    play_mode?: "pair" | "solo" | "match" | null;
  } | null;
};

const MODE_LABEL: Record<string, string> = { solo: "개인전", match: "매칭 희망" };

/** 혼자 신청한 건만 — 개인전/매칭 희망 표시 (둘이 신청은 표시 안 함) */
function ModeBadge({ mode }: { mode: string | null | undefined }) {
  const label = mode ? MODE_LABEL[mode] : null;
  if (!label) return null;
  return (
    <span
      className={`inline-flex items-center px-1.5 h-5 rounded border text-[10px] font-semibold ${
        mode === "solo"
          ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
          : "bg-violet-500/15 border-violet-500/40 text-violet-200"
      }`}
    >
      {label}
    </span>
  );
}

/** "도전파 — 고득점…" → "도전파" */
function styleShort(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.split(/\s*[—-]\s*/)[0].trim() || null;
}

const STYLE_TONE: Record<string, string> = {
  도전파: "bg-red-500/15 border-red-500/40 text-red-200",
  전략파: "bg-sky-500/15 border-sky-500/40 text-sky-200",
  소풍파: "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
};

function StyleBadge({ style }: { style: string | null }) {
  if (!style) return null;
  return (
    <span
      className={`inline-flex items-center px-1.5 h-5 rounded border text-[10px] font-semibold ${
        STYLE_TONE[style] ?? "bg-white/[0.06] border-white/10 text-gray-300"
      }`}
    >
      {style}
    </span>
  );
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Assignment = { team_no: number | null; squad: string | null };
type Update = Assignment & { id: string };

const STATUS_LABEL: Record<string, string> = {
  paid: "결제완료",
  pending: "결제대기",
  canceled: "취소",
};

function statusTone(status: string): string {
  if (status === "paid")
    return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
  if (status === "pending")
    return "bg-amber-500/15 border-amber-500/30 text-amber-300";
  return "bg-white/[0.06] border-white/10 text-gray-400";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function TeamBoard({
  slug,
  config,
  initialRows,
}: {
  slug: string;
  config: EventConfig;
  initialRows: SignupRow[];
}) {
  const [rows, setRows] = useState<SignupRow[]>(initialRows);
  const [showCanceled, setShowCanceled] = useState(false);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const flash = (kind: "error" | "info", msg: string) => {
    if (kind === "error") {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } else {
      setInfo(msg);
      setTimeout(() => setInfo(null), 2000);
    }
  };

  const teams = useMemo(
    () => Array.from({ length: config.teamCount }, (_, i) => i + 1),
    [config.teamCount]
  );

  // 배정 대상 = 취소 제외. 결제대기도 배정은 가능하되 UI 에 경고 표시.
  const active = useMemo(
    () => rows.filter((r) => r.status !== "canceled"),
    [rows]
  );

  const parties = useMemo(() => {
    const map = new Map<string, SignupRow[]>();
    for (const r of rows) {
      if (r.status === "canceled" && !showCanceled) continue;
      const list = map.get(r.order_id) ?? [];
      list.push(r);
      map.set(r.order_id, list);
    }
    return Array.from(map.values())
      .map((members) =>
        [...members].sort(
          (a, b) =>
            Number(b.is_leader) - Number(a.is_leader) ||
            a.created_at.localeCompare(b.created_at)
        )
      )
      .sort((a, b) => a[0].created_at.localeCompare(b[0].created_at));
  }, [rows, showCanceled]);

  // 플레이 스타일은 대장만 기입 → 같은 신청 건 전원에게 적용
  const styleByOrder = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const r of rows) {
      if (r.is_leader || !m.has(r.order_id)) {
        const s = styleShort(r.play_style);
        if (s || !m.has(r.order_id)) m.set(r.order_id, s);
      }
    }
    return m;
  }, [rows]);
  const styleOf = (r: SignupRow) => styleByOrder.get(r.order_id) ?? null;

  const dinnerCount = active.filter(
    (r) => r.status === "paid" && r.dinner === true
  ).length;
  const styleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of active) {
      if (r.status !== "paid") continue;
      const s = styleByOrder.get(r.order_id);
      if (s) c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [active, styleByOrder]);

  const exportCsv = () => {
    const header = [
      "상태", "팀", "조", "신청번호", "대장", "이름", "성별", "생년월일", "연락처",
      "이메일", "비상연락처 이름", "관계", "비상연락처", "플레이 스타일", "플레이 방식", "뒤풀이",
      "경험", "메모", "사진 동의", "결제금액", "결제수단", "신청시각", "결제시각",
    ];
    const lines = [...rows]
      .sort(
        (a, b) =>
          (a.team_no ?? 99) - (b.team_no ?? 99) ||
          (a.squad ?? "Z").localeCompare(b.squad ?? "Z") ||
          a.created_at.localeCompare(b.created_at)
      )
      .map((r) =>
        [
          STATUS_LABEL[r.status] ?? r.status, r.team_no ?? "", r.squad ?? "",
          r.signup_code ?? r.order_id, r.is_leader ? "Y" : "", r.name, r.gender, r.birth, r.phone,
          r.email, r.emergency_name, r.emergency_relation ?? "", r.emergency_phone,
          styleOf(r) ?? "", MODE_LABEL[r.metadata?.play_mode ?? ""] ?? (r.party_size > 1 ? "2인 신청" : ""), r.dinner ? "참석" : "불참", r.experience ?? "",
          r.note ?? "", r.agree_photo ? "Y" : "N", r.amount, r.metadata?.method ?? "",
          r.created_at, r.paid_at ?? "",
        ]
          .map(csvCell)
          .join(",")
      );
    const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-참가자-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paidCount = active.filter((r) => r.status === "paid").length;
  const pendingCount = active.filter((r) => r.status === "pending").length;
  const canceledCount = rows.length - active.length;
  const assignedCount = active.filter((r) => r.team_no != null).length;

  const membersOf = (team: number) =>
    active.filter((r) => r.team_no === team);

  /** 낙관적 반영 + 서버 저장. 실패 시 스냅샷 롤백. */
  const apply = (updates: Update[], okMsg: string) => {
    if (updates.length === 0) return;
    const snapshot = rows;
    const byId = new Map(updates.map((u) => [u.id, u]));
    setRows((prev) =>
      prev.map((r) => {
        const u = byId.get(r.id);
        return u ? { ...r, team_no: u.team_no, squad: u.squad } : r;
      })
    );
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/events/signups`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setRows(snapshot);
          flash("error", data?.error ?? "저장 실패");
          return;
        }
        flash("info", okMsg);
      } catch (e) {
        setRows(snapshot);
        flash("error", e instanceof Error ? e.message : "네트워크 오류");
      }
    });
  };

  const setMember = (id: string, patch: Partial<Assignment>) => {
    const cur = rows.find((r) => r.id === id);
    if (!cur) return;
    const team_no = patch.team_no !== undefined ? patch.team_no : cur.team_no;
    let squad = patch.squad !== undefined ? patch.squad : cur.squad;
    if (team_no == null) squad = null;
    apply([{ id, team_no, squad }], "저장됨");
  };

  /** 팀 t 안에서 빈 조 슬롯을 순서대로 채우는 배정 계획 (overflow 면 squad null) */
  const planSquads = (team: number, ids: string[]): Update[] => {
    const occupancy = new Map<string, number>();
    for (const s of config.squads) occupancy.set(s, 0);
    for (const r of membersOf(team)) {
      if (ids.includes(r.id) || !r.squad) continue;
      occupancy.set(r.squad, (occupancy.get(r.squad) ?? 0) + 1);
    }
    return ids.map((id) => {
      const free = config.squads.find(
        (s) => (occupancy.get(s) ?? 0) < config.squadSize
      );
      if (free) occupancy.set(free, (occupancy.get(free) ?? 0) + 1);
      return { id, team_no: team, squad: free ?? null };
    });
  };

  const assignParty = (members: SignupRow[], team: number) => {
    const ids = members.filter((m) => m.status !== "canceled").map((m) => m.id);
    apply(planSquads(team, ids), `팀 ${team} 에 ${ids.length}명 배정`);
  };

  const unassignParty = (members: SignupRow[]) => {
    apply(
      members.map((m) => ({ id: m.id, team_no: null, squad: null })),
      "배정 해제"
    );
  };

  /** 팀 전원 조를 순서대로 다시 나눔 (A,A,B,B…) */
  const reshuffleSquads = (team: number) => {
    const ms = membersOf(team);
    const updates: Update[] = ms.map((m, i) => ({
      id: m.id,
      team_no: team,
      squad: config.squads[Math.floor(i / config.squadSize)] ?? null,
    }));
    apply(updates, `팀 ${team} 조 재배정`);
  };

  return (
    <div className="space-y-6">
      {/* 요약 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Chip tone="ok">결제완료 {paidCount}명</Chip>
        <Chip tone="warn">결제대기 {pendingCount}명</Chip>
        <Chip>취소 {canceledCount}명</Chip>
        <Chip tone={assignedCount >= paidCount ? "ok" : undefined}>
          팀 배정 {assignedCount}/{active.length}
        </Chip>
        <Chip>뒤풀이 {dinnerCount}명</Chip>
        {Object.entries(styleCounts).map(([s, n]) => (
          <span key={s} className="inline-flex items-center gap-1">
            <StyleBadge style={s} />
            <span className="text-gray-400">{n}</span>
          </span>
        ))}
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center px-2.5 h-6 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-gray-200"
        >
          CSV 내보내기
        </button>
        <label className="ml-auto inline-flex items-center gap-1.5 text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showCanceled}
            onChange={(e) => setShowCanceled(e.target.checked)}
            className="accent-orange-400"
          />
          취소 건도 표시
        </label>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{info}</span>
        </div>
      )}

      {/* 팀 보드 */}
      <section>
        <h2 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
          팀 보드
        </h2>
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
          }}
        >
          {teams.map((t) => {
            const ms = membersOf(t);
            const over = ms.length > config.teamSize;
            const full = ms.length === config.teamSize;
            return (
              <div
                key={t}
                className={`rounded-xl border p-3 space-y-2 ${
                  over
                    ? "border-red-500/40 bg-red-500/[0.05]"
                    : full
                      ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                      : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-orange-300" />
                    <span className="text-sm font-semibold text-white">팀 {t}</span>
                    <span
                      className={`text-[11px] font-mono ${
                        over ? "text-red-300" : full ? "text-emerald-300" : "text-gray-500"
                      }`}
                    >
                      {ms.length}/{config.teamSize}
                    </span>
                  </div>
                  {ms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => reshuffleSquads(t)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 h-6 px-1.5 rounded text-[10px] text-gray-400 hover:text-white hover:bg-white/[0.06]"
                      title="조를 순서대로 다시 나눔"
                    >
                      <Shuffle className="h-3 w-3" /> 조 재배정
                    </button>
                  )}
                </div>

                {config.squads.map((s) => {
                  const sm = ms.filter((m) => m.squad === s);
                  const sOver = sm.length > config.squadSize;
                  return (
                    <div
                      key={s}
                      className={`rounded-lg border px-2 py-1.5 ${
                        sOver ? "border-red-500/40" : "border-white/[0.06]"
                      } bg-black/20`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-gray-300">
                          {s}조
                        </span>
                        <span
                          className={`text-[10px] font-mono ${
                            sOver ? "text-red-300" : "text-gray-500"
                          }`}
                        >
                          {sm.length}/{config.squadSize}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 min-h-[22px]">
                        {sm.map((m) => (
                          <MemberChip
                            key={m.id}
                            m={m}
                            style={styleOf(m)}
                            onRemove={() => setMember(m.id, { team_no: null })}
                            disabled={saving}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {ms.some((m) => !m.squad) && (
                  <div className="rounded-lg border border-dashed border-amber-500/30 px-2 py-1.5">
                    <div className="text-[11px] text-amber-300 mb-1">조 미지정</div>
                    <div className="flex flex-wrap gap-1">
                      {ms
                        .filter((m) => !m.squad)
                        .map((m) => (
                          <MemberChip
                            key={m.id}
                            m={m}
                            style={styleOf(m)}
                            onRemove={() => setMember(m.id, { team_no: null })}
                            disabled={saving}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 신청 목록 (신청 건 단위) */}
      <section>
        <h2 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
          신청 목록 · {parties.length}건
        </h2>
        <div className="space-y-3">
          {parties.map((members) => {
            const leader = members[0];
            const partyTeam = members.every(
              (m) => m.team_no != null && m.team_no === members[0].team_no
            )
              ? members[0].team_no
              : null;
            const allCanceled = members.every((m) => m.status === "canceled");
            return (
              <div
                key={leader.order_id}
                className={`rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden ${
                  allCanceled ? "opacity-60" : ""
                }`}
              >
                <div className="px-4 py-3 border-b border-white/5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {leader.name}
                    {members.length > 1 && (
                      <span className="text-gray-400 font-normal">
                        {" "}
                        외 {members.length - 1}명
                      </span>
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 h-5 rounded border text-[10px] font-medium ${statusTone(
                      leader.status
                    )}`}
                  >
                    {STATUS_LABEL[leader.status] ?? leader.status}
                  </span>
                  <StyleBadge style={styleOf(leader)} />
                  <ModeBadge mode={leader.metadata?.play_mode} />
                  {leader.signup_code ? (
                    <span
                      className="text-[12px] font-semibold text-white font-mono"
                      title={`토스 주문 ID ${leader.order_id}`}
                    >
                      {leader.signup_code}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-500 font-mono">
                      {leader.order_id}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-500">
                    신청 {fmtDate(leader.created_at)}
                    {leader.paid_at && ` · 결제 ${fmtDate(leader.paid_at)}`}
                  </span>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {(leader.order_total ?? leader.amount * members.length).toLocaleString()}원
                    {leader.metadata?.method && ` · ${leader.metadata.method}`}
                  </span>
                  {leader.metadata?.receipt && (
                    <a
                      href={leader.metadata.receipt}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-orange-300 hover:text-orange-200"
                    >
                      영수증
                    </a>
                  )}

                  {!allCanceled && (
                    <div className="ml-auto flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-gray-500 mr-1">전원 →</span>
                      {teams.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => assignParty(members, t)}
                          disabled={saving}
                          className={`h-7 min-w-[28px] px-2 rounded-md text-[11px] font-semibold border transition-colors ${
                            partyTeam === t
                              ? "bg-orange-500 border-orange-400 text-white"
                              : "bg-white/[0.04] border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.08]"
                          }`}
                        >
                          팀{t}
                        </button>
                      ))}
                      {members.some((m) => m.team_no != null) && (
                        <button
                          type="button"
                          onClick={() => unassignParty(members)}
                          disabled={saving}
                          className="h-7 px-2 rounded-md text-[11px] border border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.06]"
                        >
                          해제
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {(leader.experience || leader.note) && (
                  <div className="px-4 py-2 border-b border-white/5 text-[11px] text-gray-400 space-y-0.5">
                    {leader.experience && (
                      <div>
                        <span className="text-gray-500">경험 </span>
                        {leader.experience}
                      </div>
                    )}
                    {leader.note && (
                      <div>
                        <span className="text-gray-500">메모(팀 배정 참고) </span>
                        <span className="text-amber-200/90">{leader.note}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="divide-y divide-white/5">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
                    >
                      <div className="min-w-[120px]">
                        <span className="text-white font-medium">{m.name}</span>
                        {m.is_leader && (
                          <span className="ml-1 text-[10px] text-orange-300">대장</span>
                        )}
                        <span className="ml-2 text-gray-500">
                          {m.gender} · {m.birth}
                        </span>
                        {m.dinner && (
                          <span className="ml-2 text-[10px] text-amber-300">뒤풀이</span>
                        )}
                      </div>
                      <a
                        href={`tel:${m.phone}`}
                        className="font-mono text-gray-300 hover:text-white"
                      >
                        {m.phone}
                      </a>
                      {m.is_leader && (
                        <span className="text-gray-500 truncate max-w-[200px]">
                          {m.email}
                        </span>
                      )}
                      <span className="text-gray-500">
                        비상 {m.emergency_name}
                        {m.emergency_relation ? `(${m.emergency_relation})` : ""}{" "}
                        <span className="font-mono">{m.emergency_phone}</span>
                      </span>
                      {m.status !== leader.status && (
                        <span
                          className={`inline-flex items-center px-1.5 h-5 rounded border text-[10px] ${statusTone(
                            m.status
                          )}`}
                        >
                          {STATUS_LABEL[m.status] ?? m.status}
                        </span>
                      )}

                      {m.status !== "canceled" && (
                        <div className="ml-auto flex items-center gap-1.5">
                          {m.status === "pending" && (
                            <span className="text-[10px] text-amber-300">미결제</span>
                          )}
                          <select
                            value={m.team_no ?? ""}
                            onChange={(e) =>
                              setMember(m.id, {
                                team_no: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            disabled={saving}
                            className="h-7 px-1.5 rounded-md bg-white/[0.04] border border-white/10 text-white text-[11px] focus:outline-none focus:border-orange-500/50"
                          >
                            <option value="" className="bg-[#0c0c14]">
                              팀 없음
                            </option>
                            {teams.map((t) => (
                              <option key={t} value={t} className="bg-[#0c0c14]">
                                팀 {t}
                              </option>
                            ))}
                          </select>
                          <select
                            value={m.squad ?? ""}
                            onChange={(e) =>
                              setMember(m.id, { squad: e.target.value || null })
                            }
                            disabled={saving || m.team_no == null}
                            className="h-7 px-1.5 rounded-md bg-white/[0.04] border border-white/10 text-white text-[11px] focus:outline-none focus:border-orange-500/50 disabled:opacity-40"
                          >
                            <option value="" className="bg-[#0c0c14]">
                              조 없음
                            </option>
                            {config.squads.map((s) => (
                              <option key={s} value={s} className="bg-[#0c0c14]">
                                {s}조
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
          · 「전원 → 팀n」은 그 신청 건 참가자를 모두 해당 팀에 넣고, 빈 조부터 순서대로
          채워요. 정원을 넘으면 빨간 표시가 뜨고 조는 비워둬요.
          <br />· 결제대기 인원도 배정은 가능하지만, 확정 전엔 미결제 표시를 확인하세요.
          <br />· 배정 결과는 참가자에게 자동으로 보이지 않아요 (문자 안내 전제).
        </p>
      </section>
      <span className="sr-only">{slug}</span>
    </div>
  );
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "ok" | "warn";
}) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
      : tone === "warn"
        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
        : "bg-white/[0.04] border-white/10 text-gray-300";
  return (
    <span className={`inline-flex items-center px-2 h-6 rounded-md border ${cls}`}>
      {children}
    </span>
  );
}

function MemberChip({
  m,
  style,
  onRemove,
  disabled,
}: {
  m: SignupRow;
  style?: string | null;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const pending = m.status === "pending";
  return (
    <span
      className={`inline-flex items-center gap-1 pl-2 pr-1 h-6 rounded-full border text-[11px] ${
        pending
          ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
          : "border-white/15 bg-white/[0.06] text-white"
      }`}
      title={`${m.name} · ${m.phone}${style ? ` · ${style}` : ""}${m.dinner ? " · 뒤풀이" : ""}${pending ? " · 미결제" : ""}`}
    >
      {style && (
        <span
          className={`text-[9px] font-bold ${
            style === "도전파" ? "text-red-300" : style === "전략파" ? "text-sky-300" : "text-emerald-300"
          }`}
        >
          {style.slice(0, 1)}
        </span>
      )}
      {m.name}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="h-4 w-4 rounded-full inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
        aria-label="배정 해제"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
