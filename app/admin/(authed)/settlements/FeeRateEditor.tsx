"use client";

/** 플랫폼 수수료율 편집 — 저장 즉시 정산 계산에 반영 (이미 기록된 정산은 불변) */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Percent } from "lucide-react";

export default function FeeRateEditor({ rate }: { rate: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [percentText, setPercentText] = useState(String(rate * 100));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const parsed = Number(percentText);
  const valid = Number.isFinite(parsed) && parsed >= 0 && parsed < 100;
  const dirty = valid && parsed !== rate * 100;

  const save = async () => {
    if (!valid) {
      setErrorMsg("0 이상 100 미만의 숫자를 입력하세요.");
      return;
    }
    setErrorMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_fee_rate: parsed / 100 }),
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

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 flex flex-wrap items-center gap-4">
      <span className="flex items-center gap-2 text-sm font-semibold text-white">
        <Percent className="h-4 w-4 text-orange-300" />
        플랫폼 수수료율
      </span>
      <label className="flex items-center gap-2 text-xs text-gray-400">
        <input
          type="number"
          min={0}
          max={99}
          step={0.5}
          value={percentText}
          onChange={(e) => setPercentText(e.target.value)}
          className="w-20 h-9 px-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
        />
        %
      </label>
      <span className="text-[11px] text-gray-600 flex-1">
        새 정산 계산부터 적용돼요. 이미 완료된 정산 기록은 바뀌지 않아요.
      </span>
      {errorMsg ? <span className="text-xs text-red-400">{errorMsg}</span> : null}
      {savedAt && !dirty ? (
        <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
          <Check className="h-3 w-3" /> 저장됨
        </span>
      ) : null}
      <button
        onClick={save}
        disabled={!dirty || saving}
        className="px-3.5 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white text-sm font-medium disabled:opacity-40"
      >
        {saving ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> 저장 중
          </span>
        ) : (
          "저장"
        )}
      </button>
    </section>
  );
}
