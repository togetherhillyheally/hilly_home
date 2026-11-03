"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, MapPin, Save } from "lucide-react";
import type { LatLng } from "@/components/admin/TreasureSpotPicker";

const TreasureSpotPicker = dynamic(() => import("@/components/admin/TreasureSpotPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] rounded-xl border border-white/10 bg-white/[0.02] grid place-items-center text-xs text-gray-500">
      지도 로딩…
    </div>
  ),
});

/**
 * 보물 자리 — 지도에서 직접 찍은 자리 (2026-11-02).
 * 경로 없는 보물지도는 출발점도 여기서 옮긴다. 경로 있는 보물지도는 자리를 찍으면 랜덤 배치 대신 그 자리를 쓴다.
 */
export default function TreasureSpotsPanel({
  trailId,
  routeless,
  initialStart,
  initialSpots,
}: {
  trailId: string;
  routeless: boolean;
  initialStart: LatLng | null;
  initialSpots: LatLng[];
}) {
  const router = useRouter();
  const [val, setVal] = useState({ start: initialStart, spots: initialSpots });
  const [saving, startSave] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(val) !== JSON.stringify({ start: initialStart, spots: initialSpots }),
    [val, initialStart, initialSpots]
  );

  const save = () => {
    setMsg(null);
    if (routeless && !val.start) return setMsg({ ok: false, text: "출발점을 찍어 주세요." });
    if (routeless && val.spots.length === 0) return setMsg({ ok: false, text: "보물 자리를 1개 이상 찍어 주세요." });
    startSave(async () => {
      const res = await fetch(`/api/admin/trails/${trailId}/treasure-spots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routeless ? val : { spots: val.spots }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) return setMsg({ ok: false, text: data?.error ?? "저장 실패" });
      setMsg({ ok: true, text: "저장했어요." });
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-teal-500/30 bg-teal-500/[0.03] p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-teal-300" />
          <h2 className="text-sm font-semibold text-teal-100">
            {routeless ? "출발점과 보물 자리" : "보물 자리 지정"}
          </h2>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
          {routeless
            ? "경로 없이 만든 보물지도예요. 모험을 시작하면 여기 찍은 자리에 보물이 놓여요. 보물 개수는 찍은 자리 수예요."
            : "자리를 하나라도 찍으면 모험 시작 때 경로 랜덤 배치 대신 이 자리에 보물이 놓여요. 모두 지우고 저장하면 다시 랜덤이에요."}
        </p>
      </div>

      <TreasureSpotPicker
        start={routeless ? val.start : null}
        spots={val.spots}
        onChange={(next) => setVal({ start: routeless ? next.start : null, spots: next.spots })}
        disabled={saving}
        initialCenter={initialStart ?? undefined}
      />

      {msg && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs inline-flex items-center gap-2 ${
            msg.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {msg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {msg.text}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty}
        className="w-full h-10 rounded-lg bg-teal-400 hover:bg-teal-300 disabled:bg-teal-400/30 text-[#0b1f1c] text-sm font-semibold inline-flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        보물 자리 저장
      </button>
    </section>
  );
}
