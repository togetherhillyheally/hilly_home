"use client";

import { useCallback, useEffect, useState } from "react";
import { Gem, Loader2, Sprout, Trash2 } from "lucide-react";

type Props = {
  puzzleId: string;
  trailId: string | null;
  seriesName: string | null;
  totalPieces: number;
};

type Economics = {
  totalPieces: number;
  treasureCount: number;
  starter: number;
  needed: number;
  distanceKm: number;
  currentMultiplier: number;
  currentPerWalk: number;
  recommendedMultiplier: number;
};

type Summary = {
  count: number;
  seedCells?: number;
  trailLengthKm?: number;
  economics?: Economics | null;
};

export default function TreasurePanel({
  puzzleId,
  trailId,
  seriesName,
  totalPieces,
}: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [eco, setEco] = useState<Economics | null>(null);
  const [multInput, setMultInput] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const expected = Math.max(1, Math.min(totalPieces - 1, Math.ceil(totalPieces * 0.25)));

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/puzzles/${puzzleId}/treasures`);
      const d = (await r.json()) as Summary;
      setCount(d.count ?? 0);
      setEco(d.economics ?? null);
      if (d.economics) setMultInput(String(d.economics.currentMultiplier));
    } catch {
      setCount(0);
    }
  }, [puzzleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMultiplier(value: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/puzzles/${puzzleId}/treasures`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ multiplier: value }),
      });
      const d = (await res.json()) as { error?: string; multiplier?: number };
      if (!res.ok) setError(d.error ?? "배율 저장 실패");
      else {
        setMsg(`완주 씨앗 배율을 ×${d.multiplier}로 저장했어요.`);
        await load();
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/puzzles/${puzzleId}/treasures`, {
        method: "POST",
      });
      const d = (await res.json()) as Summary & { error?: string };
      if (!res.ok) {
        setError(d.error ?? "배치에 실패했어요.");
      } else {
        setMsg(
          `보물 ${d.count}개 배치 완료 · 씨앗 조각 ${d.seedCells}개 · 경로 ${d.trailLengthKm}km`
        );
        await load();
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (busy) return;
    if (!confirm("이 퍼즐의 보물을 모두 제거할까요?")) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/puzzles/${puzzleId}/treasures`, {
        method: "DELETE",
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) setError(d.error ?? "제거에 실패했어요.");
      else {
        setCount(0);
        setMsg("보물을 모두 제거했어요.");
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  const canPlace = !!trailId;

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <Gem className="h-4 w-4 text-amber-300" />
        <h2 className="text-sm font-bold text-white">보물 (완주 인증)</h2>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        경로를 따라 보물을 배치하면, 모험자가 그 지점을 실제로 지나야만 얻는 조각이
        돼요. 조각의 약 <span className="text-amber-300 font-semibold">1/4</span>{" "}
        (이 퍼즐은 {totalPieces}개 중 약 {expected}개)이 보물 셀이 되고, 나머지는
        걸어서 번 씨앗으로 뽑아요. 전 구간을 완주하면 보물 + 씨앗으로 퍼즐이 딱
        맞춰집니다. 보물 셀은 씨앗 뽑기에서 제외돼 무결성이 지켜져요.
      </p>

      {!canPlace && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200 mb-3">
          {seriesName
            ? "시리즈 연결 퍼즐은 자동 배치를 지원하지 않아요. 구간(코스 지도)별 퍼즐로 연결해 주세요."
            : "먼저 위에서 코스 지도를 연결하고 저장한 뒤 배치할 수 있어요."}
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className="text-sm text-gray-300">
          현재 보물:{" "}
          <span className="font-bold text-white tabular-nums">
            {count === null ? "…" : count}
          </span>
          개
        </div>
      </div>

      {/* 완주 경제성 + 씨앗 배율 */}
      {eco && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 mb-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sprout className="h-4 w-4 text-emerald-300" />
            <span className="text-xs font-bold text-white">완주 = 완성 튜닝</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
            <Row label="코스 거리" value={`${eco.distanceKm.toFixed(1)} km`} />
            <Row
              label="퍼즐 조각"
              value={`${eco.totalPieces}개 (보물 ${eco.treasureCount} + 스타터 ${eco.starter})`}
            />
            <Row
              label="씨앗으로 뽑을 조각"
              value={`${eco.needed}개`}
              strong
            />
            <Row
              label="1회 완주 예상 씨앗"
              value={`~${eco.currentPerWalk}개`}
              tone={eco.currentPerWalk >= eco.needed ? "ok" : "warn"}
            />
          </div>

          <div
            className={`rounded-md px-3 py-2 text-xs mb-3 ${
              eco.currentPerWalk >= eco.needed
                ? "bg-emerald-500/[0.08] text-emerald-200 border border-emerald-500/20"
                : "bg-amber-500/[0.08] text-amber-200 border border-amber-500/20"
            }`}
          >
            {eco.currentPerWalk >= eco.needed
              ? `현재 배율 ×${eco.currentMultiplier} 로 1회 완주하면 퍼즐이 완성돼요 (남는 씨앗은 잔고).`
              : `현재 배율 ×${eco.currentMultiplier} 로는 1회 완주로 부족해요. 권장 배율 ×${eco.recommendedMultiplier} 이상을 적용하세요.`}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-400">완주 씨앗 배율 ×</label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              max="20"
              value={multInput}
              onChange={(e) => setMultInput(e.target.value)}
              className="w-20 rounded-md border border-white/10 bg-white/[0.03] px-2 h-8 text-sm text-white tabular-nums focus:outline-none focus:border-emerald-400/40"
            />
            <button
              type="button"
              onClick={() => saveMultiplier(Number(multInput))}
              disabled={busy || multInput === "" || Number(multInput) === eco.currentMultiplier}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed px-3 h-8 text-xs font-semibold text-white transition"
            >
              저장
            </button>
            {eco.recommendedMultiplier !== eco.currentMultiplier && (
              <button
                type="button"
                onClick={() => saveMultiplier(eco.recommendedMultiplier)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.15] disabled:opacity-40 px-3 h-8 text-xs font-semibold text-emerald-200 transition"
              >
                권장 ×{eco.recommendedMultiplier} 적용
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            배율은 이 코스의 브랜드 씨앗 적립량에만 곱해져요(일반 씨앗·타 코스 영향 없음).
            거리·배속 안전장치는 그대로 유지됩니다.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={regenerate}
          disabled={!canPlace || busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 h-9 text-sm font-semibold text-black transition"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Gem className="h-4 w-4" />
          )}
          {count && count > 0 ? "다시 배치" : "보물 자동 배치"}
        </button>
        {count !== null && count > 0 && (
          <button
            type="button"
            onClick={clearAll}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-40 px-3.5 h-9 text-sm font-medium text-gray-300 transition"
          >
            <Trash2 className="h-4 w-4" />
            모두 제거
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-500 mt-3">
        · 다시 배치하면 기존 보물은 지워지고 새 위치·조각으로 교체돼요. 이미 보물을
        획득한 모험자의 조각은 유지됩니다.
        <br />· 조각 수(격자)나 코스를 바꾼 뒤에는 다시 배치해 주세요.
      </p>

      {msg && <p className="text-xs text-emerald-300 mt-2">{msg}</p>}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </section>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "ok" | "warn";
}) {
  const valueColor =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-white";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-400">{label}</span>
      <span
        className={`${valueColor} ${strong ? "font-bold" : "font-medium"} tabular-nums text-right`}
      >
        {value}
      </span>
    </div>
  );
}
