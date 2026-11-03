"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, MapPin, Save } from "lucide-react";
import type { LatLng } from "@/components/admin/TreasureSpotPicker";
import {
  TREASURE_REWARD_KIND_LABELS,
  TREASURE_REWARD_KINDS,
  validateSpotReward,
  type TreasureRewardKind,
  type TreasureSpotReward,
} from "@/lib/trail-treasure";

const TreasureSpotPicker = dynamic(() => import("@/components/admin/TreasureSpotPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] rounded-xl border border-white/10 bg-white/[0.02] grid place-items-center text-xs text-gray-500">
      지도 로딩…
    </div>
  ),
});

/** 보물 자리 + 자리별 보상 (null = 보상 풀에서 랜덤) */
export type TreasureSpot = LatLng & { reward?: TreasureSpotReward | null };

/**
 * 보물 자리 — 지도에서 직접 찍은 자리 (2026-11-02).
 * 경로 없는 보물지도는 출발점도 여기서 옮긴다. 경로 있는 보물지도는 자리를 찍으면 랜덤 배치 대신 그 자리를 쓴다.
 * 자리마다 보상을 정할 수 있다 (2026-11-03). 정하지 않은 자리는 모험 시작 때 보상 풀에서 뽑는다.
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
  initialSpots: TreasureSpot[];
}) {
  const router = useRouter();
  const [val, setVal] = useState<{ start: LatLng | null; spots: TreasureSpot[] }>({
    start: initialStart,
    spots: initialSpots,
  });
  const [saving, startSave] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(val) !== JSON.stringify({ start: initialStart, spots: initialSpots }),
    [val, initialStart, initialSpots]
  );

  const setReward = (i: number, reward: TreasureSpotReward | null) =>
    setVal((v) => ({ ...v, spots: v.spots.map((s, j) => (j === i ? { ...s, reward } : s)) }));

  const changeKind = (i: number, kind: TreasureRewardKind | "") => {
    if (!kind) return setReward(i, null);
    const prev = val.spots[i].reward;
    if (kind === "seed") setReward(i, { kind, value: prev?.kind === "seed" ? prev.value : 5, label: "" });
    else if (kind === "prize") setReward(i, { kind, value: 0, label: prev?.kind === "prize" ? prev.label : "" });
    else setReward(i, { kind, value: 0, label: "꽝" });
  };

  const save = () => {
    setMsg(null);
    if (routeless && !val.start) return setMsg({ ok: false, text: "출발점을 찍어 주세요." });
    if (routeless && val.spots.length === 0) return setMsg({ ok: false, text: "보물 자리를 1개 이상 찍어 주세요." });
    const spots: { lat: number; lng: number; reward: TreasureSpotReward | null }[] = [];
    for (let i = 0; i < val.spots.length; i++) {
      const s = val.spots[i];
      const r = validateSpotReward(s.reward ?? null, i + 1);
      if (!r.ok) return setMsg({ ok: false, text: r.message });
      spots.push({ lat: s.lat, lng: s.lng, reward: r.value });
    }
    startSave(async () => {
      const res = await fetch(`/api/admin/trails/${trailId}/treasure-spots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routeless ? { start: val.start, spots } : { spots }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) return setMsg({ ok: false, text: data?.error ?? "저장 실패" });
      setMsg({ ok: true, text: "저장했어요." });
      router.refresh();
    });
  };

  const fixedCount = val.spots.filter((s) => s.reward).length;

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
        onChange={(next) =>
          setVal({ start: routeless ? next.start : null, spots: next.spots as TreasureSpot[] })
        }
        disabled={saving}
        initialCenter={initialStart ?? undefined}
      />

      {/* 자리별 보상 (2026-11-03) */}
      {val.spots.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="flex items-baseline justify-between gap-2 px-3 py-2 border-b border-white/5">
            <span className="text-xs font-semibold text-gray-200">보물마다 상품 정하기</span>
            <span className="text-[11px] text-gray-500">
              {fixedCount}/{val.spots.length}개 지정 · 나머지는 보상 풀에서 랜덤
            </span>
          </div>
          <ul className="divide-y divide-white/5">
            {val.spots.map((s, i) => {
              const r = s.reward ?? null;
              return (
                <li key={i} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-[#E8B84B] bg-[#F4F4F5] text-[11px] font-extrabold text-[#7A5A0E]">
                    {i + 1}
                  </span>
                  <select
                    value={r?.kind ?? ""}
                    onChange={(e) => changeKind(i, e.target.value as TreasureRewardKind | "")}
                    disabled={saving}
                    className="h-8 rounded-md border border-white/10 bg-[#0c0c14] px-2 text-xs text-gray-100 focus:border-teal-400/50 focus:outline-none"
                  >
                    <option value="">보상 풀에서 랜덤</option>
                    {TREASURE_REWARD_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {TREASURE_REWARD_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  {r?.kind === "seed" && (
                    <>
                      <input
                        type="number"
                        min={1}
                        value={r.value}
                        onChange={(e) => setReward(i, { ...r, value: Number(e.target.value) })}
                        disabled={saving}
                        className="h-8 w-20 rounded-md border border-white/10 bg-white/[0.04] px-2 text-right text-xs tabular-nums text-white focus:border-teal-400/50 focus:outline-none"
                      />
                      <span className="text-xs text-gray-400">개</span>
                    </>
                  )}
                  {r?.kind === "prize" && (
                    <input
                      value={r.label}
                      maxLength={20}
                      placeholder="상품 이름 (예: 스타벅스 쿠폰)"
                      onChange={(e) => setReward(i, { ...r, label: e.target.value })}
                      disabled={saving}
                      className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-xs text-white placeholder:text-gray-600 focus:border-teal-400/50 focus:outline-none"
                    />
                  )}
                  {!r && <span className="text-[11px] text-gray-500">모험 시작 때 뽑아요</span>}
                </li>
              );
            })}
          </ul>
          <p className="px-3 py-2 border-t border-white/5 text-[11px] leading-relaxed text-gray-500">
            어떤 상자에 무엇이 들었는지는 참가자에게 보이지 않아요. 상품은 획득자 명단에서 지급 처리해요.
          </p>
        </div>
      )}

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
        보물 자리·상품 저장
      </button>
    </section>
  );
}
