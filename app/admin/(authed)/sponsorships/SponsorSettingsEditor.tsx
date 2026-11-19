"use client";

/** 후원 수수료율 + 결제 열기/잠금 — 토스 상품 심사가 끝나면 여기서 결제를 연다 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, Percent, Unlock } from "lucide-react";

export default function SponsorSettingsEditor({
  rate,
  paymentsEnabled,
}: {
  rate: number;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [percentText, setPercentText] = useState(String(rate * 100));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const parsed = Number(percentText);
  const valid = Number.isFinite(parsed) && parsed >= 0 && parsed < 100;
  const dirty = valid && parsed !== rate * 100;

  const save = async (body: { sponsor_fee_rate?: number; sponsor_payments_enabled?: boolean }) => {
    setErrorMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sponsor-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        <Percent className="h-4 w-4 text-amber-300" />
        후원 수수료율
      </span>
      <label className="flex items-center gap-2 text-xs text-gray-400">
        <input
          type="number"
          min={0}
          max={99}
          step={0.5}
          value={percentText}
          onChange={(e) => setPercentText(e.target.value)}
          className="w-20 h-9 px-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50"
        />
        %
      </label>
      <button
        type="button"
        disabled={!dirty || saving}
        onClick={() => {
          if (!valid) return setErrorMsg("0 이상 100 미만의 숫자를 입력하세요.");
          void save({ sponsor_fee_rate: parsed / 100 });
        }}
        className="h-9 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-gray-200 disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "저장"}
      </button>

      <span className="mx-2 h-6 w-px bg-white/10" />

      <button
        type="button"
        disabled={saving}
        onClick={() => {
          if (
            !window.confirm(
              paymentsEnabled
                ? "후원 결제를 잠글까요? 관전 페이지의 후원 버튼이 '준비 중'으로 바뀌어요."
                : "후원 결제를 열까요? 토스 상품 심사가 끝난 뒤에만 여세요."
            )
          )
            return;
          void save({ sponsor_payments_enabled: !paymentsEnabled });
        }}
        className={
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold " +
          (paymentsEnabled
            ? "bg-emerald-600/80 hover:bg-emerald-600 text-white"
            : "bg-orange-500/80 hover:bg-orange-500 text-white")
        }
      >
        {paymentsEnabled ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        {paymentsEnabled ? "결제 열림 — 잠그기" : "결제 잠김(심사 중) — 열기"}
      </button>

      {errorMsg ? <span className="text-xs text-red-400">{errorMsg}</span> : null}
      {savedAt && !dirty ? (
        <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
          <Check className="h-3.5 w-3.5" /> 저장됨
        </span>
      ) : null}
    </section>
  );
}
