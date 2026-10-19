"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, ShieldCheck, UserMinus, UserPlus } from "lucide-react";

type Profile = { id: string; nickname: string | null; phone_number: string | null };
type ManagerRow = { user_id: string; created_at: string; profiles: Profile | null };

/** 완주 리워드 현장 운영자 — 앱 설정에 "이벤트 운영" 메뉴가 뜨고 QR/코드 확인·지급 처리 가능 */
export default function RewardManagersPanel({ puzzleId }: { puzzleId: string }) {
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (query = "") => {
      const r = await fetch(
        `/api/admin/puzzles/${puzzleId}/reward-managers${query ? `?q=${encodeURIComponent(query)}` : ""}`
      );
      const d = (await r.json()) as { managers?: ManagerRow[]; candidates?: Profile[]; error?: string };
      if (!r.ok) {
        setError(d.error ?? "불러오기 실패");
        return;
      }
      setManagers(d.managers ?? []);
      setCandidates(d.candidates ?? []);
    },
    [puzzleId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => void load(q.trim().length >= 2 ? q.trim() : ""), 350);
    return () => clearTimeout(t);
  }, [q, load]);

  async function mutate(method: "POST" | "DELETE", userId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/puzzles/${puzzleId}/reward-managers`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) setError(d.error ?? "저장 실패");
      else await load(q.trim().length >= 2 ? q.trim() : "");
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  const managerIds = new Set(managers.map((m) => m.user_id));

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <ShieldCheck className="h-4 w-4 text-emerald-300" />
        <h2 className="text-sm font-bold text-white">현장 리워드 운영자</h2>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        지정된 회원은 앱 설정에 <span className="text-emerald-200">이벤트 운영 → 리워드 코드 확인</span> 메뉴가 생겨
        현장에서 QR 을 스캔하거나 코드를 입력해 이 퍼즐의 리워드를 지급 처리할 수 있어요. 슈퍼관리자는 지정 없이도 가능해요.
      </p>

      {managers.length === 0 ? (
        <p className="text-xs text-gray-500 mb-3">아직 지정된 운영자가 없어요.</p>
      ) : (
        <ul className="space-y-1.5 mb-4">
          {managers.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white">{m.profiles?.nickname ?? "(닉네임 없음)"}</div>
                <div className="text-[11px] text-gray-500 tabular-nums">{m.profiles?.phone_number ?? m.user_id}</div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (confirm("이 운영자를 제거할까요?")) void mutate("DELETE", m.user_id);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40 px-2.5 h-8 text-xs text-gray-300 transition"
              >
                <UserMinus className="h-3.5 w-3.5" />
                제거
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="닉네임 / 전화번호로 회원 검색 후 추가"
          className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-emerald-500/50"
        />
      </div>
      {candidates.length > 0 && (
        <ul className="mt-2 max-w-md space-y-1">
          {candidates.map((c) => {
            const already = managerIds.has(c.id);
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{c.nickname ?? "(닉네임 없음)"}</div>
                  <div className="text-[11px] text-gray-500 tabular-nums">{c.phone_number ?? c.id}</div>
                </div>
                <button
                  type="button"
                  disabled={busy || already}
                  onClick={() => void mutate("POST", c.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 disabled:opacity-40 px-2.5 h-8 text-xs transition"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  {already ? "지정됨" : "운영자 추가"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </section>
  );
}
