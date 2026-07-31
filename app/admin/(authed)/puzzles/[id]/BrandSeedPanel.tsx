"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Sprout } from "lucide-react";

const COLOR_PRESETS = [
  "#DC2F55",
  "#FF6B00",
  "#FFB800",
  "#00C853",
  "#2196F3",
  "#9C27B0",
  "#00BCD4",
  "#FF4081",
];

type Summary = {
  connected: boolean;
  trailName?: string | null;
  pieceColor?: string | null;
  pieceLabel?: string | null;
};

export default function BrandSeedPanel({ puzzleId }: { puzzleId: string }) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [trailName, setTrailName] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/puzzles/${puzzleId}/brand`);
      const d = (await r.json()) as Summary;
      setConnected(!!d.connected);
      setTrailName(d.trailName ?? null);
      setColor(d.pieceColor ?? null);
      setLabel(d.pieceLabel ?? "");
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [puzzleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(clear = false) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/puzzles/${puzzleId}/brand`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          clear
            ? { pieceColor: null, pieceLabel: null }
            : { pieceColor: color, pieceLabel: label.trim() || null }
        ),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) setError(d.error ?? "저장 실패");
      else {
        setMsg(clear ? "커스텀 씨앗을 해제했어요." : "커스텀 씨앗을 저장했어요.");
        if (clear) {
          setColor(null);
          setLabel("");
        }
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <Sprout className="h-4 w-4 text-rose-300" />
        <h2 className="text-sm font-bold text-white">커스텀 씨앗 (브랜드)</h2>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        연결된 코스를 걸으면 지급되는 브랜드 씨앗의 색·이름을 정해요. 색을 지정하면
        그 코스가 브랜드 코스가 되고, 걷기로 이 퍼즐 전용 씨앗이 적립됩니다.
      </p>

      {loading ? (
        <div className="text-sm text-gray-500">불러오는 중…</div>
      ) : !connected ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
          먼저 위에서 코스 지도를 연결하고 저장해 주세요.
        </div>
      ) : (
        <>
          {trailName && (
            <p className="text-[11px] text-gray-500 mb-3">대상 코스: {trailName}</p>
          )}

          {/* 미리보기 */}
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: (color ?? "#6b7280") + "33" }}
            >
              <Sprout className="h-4 w-4" style={{ color: color ?? "#9ca3af" }} />
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: color ?? "#9ca3af" }}
            >
              {label.trim() || "씨앗 조각 미설정"}
            </span>
          </div>

          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            조각 라벨
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={20}
            placeholder="예: 광교씨앗"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 h-10 text-sm text-white mb-4 focus:outline-none focus:border-rose-400/40"
          />

          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            조각 색상
          </label>
          <div className="flex flex-wrap gap-2.5 mb-4">
            {COLOR_PRESETS.map((c) => {
              const sel = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className="h-9 w-9 rounded-full flex items-center justify-center transition"
                  style={{
                    backgroundColor: c,
                    outline: sel ? "2px solid #fff" : "none",
                    outlineOffset: 2,
                  }}
                >
                  {sel && <Check className="h-4 w-4 text-white" />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={busy || !color}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/90 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 h-9 text-sm font-semibold text-white transition"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              저장
            </button>
            {(color || label) && (
              <button
                type="button"
                onClick={() => save(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-40 px-3.5 h-9 text-sm font-medium text-gray-300 transition"
              >
                해제
              </button>
            )}
          </div>

          {msg && <p className="text-xs text-emerald-300 mt-2">{msg}</p>}
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </>
      )}
    </section>
  );
}
