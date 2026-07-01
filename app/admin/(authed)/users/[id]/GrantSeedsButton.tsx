"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sprout, X } from "lucide-react";

type TrailMini = { id: string; name: string; series_name: string | null };

type Props = {
  userId: string;
  nickname: string | null;
  currentSeedBalance: number;
  currentCampfireBalance: number;
};

type Currency = "seed" | "campfire";

export default function GrantSeedsButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 text-xs font-medium border border-emerald-500/30 transition-colors"
      >
        <Sprout className="h-3.5 w-3.5" />
        씨앗 지급/차감
      </button>
      {open ? (
        <GrantModal {...props} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function GrantModal({
  userId,
  nickname,
  currentSeedBalance,
  currentCampfireBalance,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [currency, setCurrency] = useState<Currency>("seed");
  const [delta, setDelta] = useState<string>("10");
  const [memo, setMemo] = useState("");
  const [trailQuery, setTrailQuery] = useState("");
  const [trail, setTrail] = useState<TrailMini | null>(null);
  const [trails, setTrails] = useState<TrailMini[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currency !== "seed") return;
    if (trail) return;
    const q = trailQuery.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setTrailLoading(true);
      try {
        const res = await fetch(
          `/api/admin/trails/search?q=${encodeURIComponent(q)}&limit=12`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = (await res.json()) as { rows: TrailMini[] };
          setTrails(data.rows ?? []);
        }
      } catch {
        // ignore
      } finally {
        setTrailLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trailQuery, currency, trail]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) {
      setError("0이 아닌 정수를 입력하세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/seeds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          trail_id: currency === "seed" && trail ? trail.id : null,
          delta: n,
          memo: memo.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? `실패 (${res.status})`);
        return;
      }
      startTransition(() => router.refresh());
      onClose();
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  const currentBalance =
    currency === "seed" ? currentSeedBalance : currentCampfireBalance;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161616] p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              씨앗 지급 / 차감
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              대상: {nickname ?? "(닉네임 없음)"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-white/10 text-gray-400 inline-flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 종류 토글 */}
        <div>
          <div className="text-xs text-gray-400 mb-1.5">종류</div>
          <div className="flex gap-1.5">
            {(["seed", "campfire"] as const).map((c) => {
              const active = currency === c;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => {
                    setCurrency(c);
                    setTrail(null);
                    setTrailQuery("");
                  }}
                  className={`flex-1 px-3 h-9 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
                      : "bg-white/[0.04] text-gray-400 border-white/10 hover:text-white"
                  }`}
                >
                  {c === "seed" ? "씨앗 (일반/브랜드)" : "정원 씨앗"}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            현재 잔액 ·{" "}
            <span className="text-gray-300 font-mono">
              {currentBalance.toLocaleString()}
            </span>
          </p>
        </div>

        {/* 트레일 선택 (seed만) */}
        {currency === "seed" ? (
          <div>
            <div className="text-xs text-gray-400 mb-1.5">
              트레일 (선택 — 없으면 일반 풀)
            </div>
            {trail ? (
              <div className="flex items-center justify-between gap-2 px-3 h-9 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-xs">
                <div className="truncate">
                  {trail.series_name ? `${trail.series_name} · ` : ""}
                  {trail.name}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTrail(null);
                    setTrailQuery("");
                  }}
                  className="text-emerald-300 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={trailQuery}
                  onChange={(e) => setTrailQuery(e.target.value)}
                  placeholder="트레일명 또는 시리즈명 검색"
                  className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-emerald-500/50"
                />
                {trailLoading ? (
                  <div className="mt-1.5 text-[11px] text-gray-500">검색 중…</div>
                ) : trails.length > 0 ? (
                  <ul className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] divide-y divide-white/5">
                    {trails.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => setTrail(t)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-emerald-500/10 hover:text-white"
                        >
                          {t.series_name ? (
                            <span className="text-gray-500">
                              {t.series_name} ·{" "}
                            </span>
                          ) : null}
                          {t.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : trailQuery.trim() ? (
                  <div className="mt-1.5 text-[11px] text-gray-500">
                    일치하는 트레일이 없어요.
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {/* 수량 */}
        <div>
          <div className="text-xs text-gray-400 mb-1.5">
            수량 (음수면 차감)
          </div>
          <div className="flex gap-1.5">
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              step={1}
              className="flex-1 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50"
              required
            />
            {[10, 50, 100, -10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDelta(String(n))}
                className="px-2 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-mono border border-white/10"
              >
                {n > 0 ? `+${n}` : n}
              </button>
            ))}
          </div>
        </div>

        {/* 메모 */}
        <div>
          <div className="text-xs text-gray-400 mb-1.5">
            메모 (선택 · 원장에 기록)
          </div>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={500}
            placeholder="예: 이벤트 보상, 어뷰징 회수…"
            className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {error ? (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-medium"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sprout className="h-3.5 w-3.5" />
            )}
            적용
          </button>
        </div>
      </form>
    </div>
  );
}
