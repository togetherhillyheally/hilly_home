"use client";

/**
 * 보물상자 뽑기 확률(가중치) 편집 — treasure_box_odds 를 RPC 로 갱신.
 * 저장 즉시 서버 draw_treasure_box 추첨에 반영됩니다.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Settings2 } from "lucide-react";
import {
  DEFAULT_BOTTLE_ODDS,
  expectedReturnRate,
  oddsPercent,
  type BottleOdds,
} from "./bottleOdds";

function toDrafts(odds: BottleOdds): Record<number, string> {
  const draft: Record<number, string> = {};
  for (const o of odds) draft[o.mult] = String(o.weight);
  return draft;
}

export default function BottleOddsEditor({ odds }: { odds: BottleOdds }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const initialDraft = toDrafts(
    odds.length === 5 ? odds : DEFAULT_BOTTLE_ODDS
  );
  const [draft, setDraft] = useState<Record<number, string>>(initialDraft);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  const validationError = (() => {
    for (const o of DEFAULT_BOTTLE_ODDS) {
      const raw = draft[o.mult] ?? "";
      const w = Number(raw);
      if (raw.trim() === "" || !Number.isInteger(w) || w < 0 || w > 1000000) {
        return `x${o.mult} 가중치는 0 이상의 정수여야 해요.`;
      }
    }
    const sum = DEFAULT_BOTTLE_ODDS.reduce(
      (s, o) => s + Number(draft[o.mult] ?? 0),
      0
    );
    if (sum <= 0) return "가중치 합이 0보다 커야 해요.";
    return null;
  })();

  const previewOdds: BottleOdds | null = validationError
    ? null
    : DEFAULT_BOTTLE_ODDS.map((o) => ({
        mult: o.mult,
        weight: Number(draft[o.mult]),
      }));

  const save = async () => {
    if (validationError || !previewOdds) {
      setErrorMsg(validationError ?? "");
      return;
    }
    setErrorMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/bottle-odds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ odds: previewOdds }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "저장 실패");
        return;
      }
      setSavedAt(Date.now());
      startTransition(() => router.refresh());
    } catch {
      setErrorMsg("네트워크 오류");
    } finally {
      setSaving(false);
    }
  };

  const percents = previewOdds ? oddsPercent(previewOdds) : null;
  const expected = previewOdds ? expectedReturnRate(previewOdds) : null;

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Settings2 className="h-4 w-4 text-sky-300" />
          뽑기 확률 설정
          <span className="text-[11px] font-normal text-gray-500">
            저장 즉시 서버 추첨에 반영
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
              배율별 가중치 (숫자가 클수록 자주 나옴 — 상대 비율만 의미 있어요)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {DEFAULT_BOTTLE_ODDS.map((o) => (
                <label
                  key={o.mult}
                  className="flex items-center gap-2 text-xs text-gray-400"
                >
                  <span className="w-8 text-right font-mono text-gray-300">
                    x{o.mult}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    value={draft[o.mult] ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [o.mult]: e.target.value,
                      }))
                    }
                    className="w-20 h-9 px-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-sky-500/50"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          {percents && expected != null ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {percents.map((p) => (
                <span
                  key={p.mult}
                  className="px-2 py-1 rounded-md bg-white/[0.03] border border-white/10 text-[11px] font-mono text-gray-300"
                >
                  x{p.mult} {p.pct.toFixed(1)}%
                </span>
              ))}
              <span
                className={`px-2 py-1 rounded-md border text-[11px] font-mono ${
                  expected > 1
                    ? "bg-red-500/10 border-red-500/30 text-red-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >
                기대 배율 {expected.toFixed(2)}x
                {expected > 1 ? " (유저 유리)" : " (하우스 유리)"}
              </span>
            </div>
          ) : null}

          {errorMsg || validationError ? (
            <p className="text-xs text-red-400">
              {errorMsg || validationError}
            </p>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-600 leading-relaxed max-w-md">
              저장하면 앱의 보물상자 뽑기(draw_treasure_box) 확률에 바로
              적용돼요. 이미 뽑힌 내역은 변하지 않아요.
            </p>
            <div className="flex items-center gap-3">
              {savedAt && !dirty ? (
                <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
                  <Check className="h-3 w-3" /> 저장됨
                </span>
              ) : null}
              <button
                onClick={save}
                disabled={!dirty || saving || !!validationError}
                className="px-4 h-9 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 hover:opacity-90 text-white text-sm font-medium disabled:opacity-40"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> 저장 중...
                  </span>
                ) : (
                  "확률 저장"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
