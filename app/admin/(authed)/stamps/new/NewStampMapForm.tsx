"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import SeriesNameInput, {
  invalidateSeriesNamesCache,
} from "@/components/admin/SeriesNameInput";

type OrderMode = "free" | "ordered" | "random";

const ORDER_MODES: { value: OrderMode; label: string; desc: string }[] = [
  {
    value: "free",
    label: "자유",
    desc: "참가자가 원하는 순서로 어떤 스탬프든 찍을 수 있음",
  },
  {
    value: "ordered",
    label: "순서",
    desc: "정해진 번호 순서대로 찍어야 다음 스탬프가 열림",
  },
  {
    value: "random",
    label: "랜덤",
    desc: "참가자마다 다른 순서로 노출되는 스탬프 챌린지",
  },
];

export default function NewStampMapForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [orderMode, setOrderMode] = useState<OrderMode>("free");
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const submit = () => {
    if (!name.trim()) {
      setError("지도 이름을 입력해주세요.");
      return;
    }
    setError(null);
    startSubmit(async () => {
      try {
        const res = await fetch("/api/admin/stamps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            series_name: seriesName.trim() || null,
            stamp_order_mode: orderMode,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "생성 실패");
          return;
        }
        if (seriesName.trim()) invalidateSeriesNamesCache();
        router.push(`/admin/stamps/${data.trail.id}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "생성 실패");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            지도 이름 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 동서트레일 스탬프 챌린지"
            disabled={submitting}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            시리즈명 (선택)
          </label>
          <SeriesNameInput
            value={seriesName}
            onChange={setSeriesName}
            placeholder="예: 동서트레일"
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">순서 모드</label>
          <div className="grid sm:grid-cols-3 gap-2">
            {ORDER_MODES.map((m) => {
              const active = orderMode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setOrderMode(m.value)}
                  disabled={submitting}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? "bg-orange-500/15 border-orange-500/50"
                      : "bg-white/[0.04] border-white/10 hover:border-white/25"
                  }`}
                >
                  <div
                    className={`text-sm font-semibold ${
                      active ? "text-orange-200" : "text-white"
                    }`}
                  >
                    {m.label}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                    {m.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !name.trim()}
        className="w-full h-11 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-white/[0.06] disabled:text-gray-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            만드는 중…
          </>
        ) : (
          <>
            만들고 포인트 추가하러 가기
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
