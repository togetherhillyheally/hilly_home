"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Dices,
  Loader2,
  Map as MapIcon,
  Save,
} from "lucide-react";
import { TreasureChest } from "@/components/admin/TreasureChestIcon";
import {
  DEFAULT_TREASURE_REWARD_POOL,
  TREASURE_COUNT_MAX,
  TREASURE_LIMIT_PRESETS,
  validateTreasureCount,
  validateTreasureLimit,
  validateTreasureRewardPool,
  type TreasureReward,
} from "@/lib/trail-treasure";
import {
  computeTreasureHuntPlacement,
  type TreasurePlacement,
} from "@/lib/trail-treasure-placement";
import TreasureSettingsFields from "./TreasureSettingsFields";

const TreasureMap = dynamic(() => import("@/components/admin/TreasureMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] rounded-xl border border-white/10 bg-white/[0.02] grid place-items-center text-xs text-gray-500">
      지도 로딩…
    </div>
  ),
});

type Coord = [number, number] | [number, number, number];
type Coordinates = Coord[] | Coord[][];

type Props = {
  trailId: string;
  initialCount: number;
  initialPool: TreasureReward[];
  /** 한 사람당 찾을 수 있는 보물 수 — null = 제한 없음 */
  initialLimit: number | null;
  coordinates: Coordinates | null;
  /** GPX 없이 만든 보물지도 — 개수는 찍은 자리 수, 경로 미리보기 없음 */
  routeless?: boolean;
};

function cloneDefaults(): TreasureReward[] {
  return DEFAULT_TREASURE_REWARD_POOL.map((r) => ({ ...r }));
}

export default function TreasureSettingsPanel({
  trailId,
  initialCount,
  initialPool,
  initialLimit,
  coordinates,
  routeless,
}: Props) {
  const router = useRouter();
  const [count, setCount] = useState<number>(initialCount);
  const [limit, setLimit] = useState<number | null>(initialLimit);
  const [pool, setPool] = useState<TreasureReward[]>(() =>
    (initialPool ?? []).length > 0
      ? initialPool.map((r) => ({ ...r }))
      : cloneDefaults()
  );
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [placement, setPlacement] = useState<TreasurePlacement[]>([]);

  // 미리보기를 열거나 count 가 바뀌면 자동으로 새로 뽑는다.
  useEffect(() => {
    if (!showPreview) return;
    setPlacement(computeTreasureHuntPlacement(coordinates, count));
  }, [showPreview, count, coordinates]);

  const reroll = () => {
    setPlacement(computeTreasureHuntPlacement(coordinates, count));
  };

  const hasRoute =
    Array.isArray(coordinates) && (coordinates as unknown[]).length > 0;

  const dirty = useMemo(() => {
    if (count !== initialCount) return true;
    if (limit !== initialLimit) return true;
    if (pool.length !== (initialPool ?? []).length) return true;
    return JSON.stringify(pool) !== JSON.stringify(initialPool ?? []);
  }, [count, limit, pool, initialCount, initialLimit, initialPool]);

  const resetDefaults = () => {
    if (!confirm("기본 보상 풀로 되돌릴까요? 지금 입력한 내용은 사라져요.")) {
      return;
    }
    setPool(cloneDefaults());
  };

  const save = () => {
    setError(null);
    setSuccess(null);
    const countR = validateTreasureCount(count);
    if (!countR.ok) {
      setError(countR.message);
      return;
    }
    const poolR = validateTreasureRewardPool(pool);
    if (!poolR.ok) {
      setError(poolR.message);
      return;
    }
    const limitR = validateTreasureLimit(limit);
    if (!limitR.ok) {
      setError(limitR.message);
      return;
    }
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            treasure_count: countR.value,
            treasure_reward_pool: poolR.value,
            treasure_per_person_limit: limitR.value,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setError(data?.error ?? "저장 실패");
          return;
        }
        setSuccess("저장되었습니다.");
        router.refresh();
        setTimeout(() => setSuccess(null), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  };

  return (
    <section className="rounded-xl border border-teal-500/30 bg-teal-500/[0.03] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TreasureChest className="h-4 w-4 text-teal-300" />
        <h2 className="text-sm font-semibold text-teal-100">보물지도 설정</h2>
      </div>

      <TreasureSettingsFields
        count={count}
        setCount={setCount}
        pool={pool}
        setPool={setPool}
        onResetDefaults={resetDefaults}
        hideCount={routeless}
      />

      {/* 한 사람당 찾을 수 있는 보물 수 (2026-11-03) */}
      <div>
        <label className="block text-xs text-gray-300 mb-1.5">
          한 사람당 찾을 수 있는 보물{" "}
          <span className="text-gray-500">(다 찾으면 남은 상자는 다른 사람 몫)</span>
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {TREASURE_LIMIT_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setLimit(p)}
              className={`h-8 px-3 rounded-md text-xs border transition-colors ${
                limit === p
                  ? "bg-teal-500/20 border-teal-400/60 text-teal-100"
                  : "bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.06]"
              }`}
            >
              {p}개
            </button>
          ))}
          <button
            type="button"
            onClick={() => setLimit(null)}
            className={`h-8 px-3 rounded-md text-xs border transition-colors ${
              limit === null
                ? "bg-teal-500/20 border-teal-400/60 text-teal-100"
                : "bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.06]"
            }`}
          >
            제한 없음
          </button>
          <span className="ml-2 text-xs text-gray-500">직접</span>
          <input
            type="number"
            min={1}
            max={TREASURE_COUNT_MAX}
            value={limit ?? ""}
            placeholder="∞"
            onChange={(e) => setLimit(e.target.value === "" ? null : Number(e.target.value))}
            className="w-16 h-8 px-2 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs text-right tabular-nums focus:outline-none focus:border-teal-400/50"
          />
          <span className="text-xs text-gray-500">개</span>
        </div>
      </div>

      {/* 배치 미리보기 — 실제 세션은 매번 새로 뽑히므로 "샘플" 임을 명시 */}
      {!routeless && (
      <div className="rounded-lg border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            disabled={!hasRoute}
            className="inline-flex items-center gap-2 text-xs text-gray-200 hover:text-white disabled:opacity-40"
          >
            <MapIcon className="h-3.5 w-3.5 text-teal-300" />
            경로상 배치 미리보기
            <span className="text-[10px] text-gray-500">
              ({showPreview ? "접기" : "펼치기"})
            </span>
          </button>
          {showPreview ? (
            <button
              type="button"
              onClick={reroll}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] text-teal-200 hover:text-teal-100 hover:bg-white/[0.05]"
            >
              <Dices className="h-3 w-3" /> 다시 뽑기
            </button>
          ) : null}
        </div>
        {showPreview ? (
          <div className="p-3 space-y-2">
            {hasRoute && placement.length > 0 ? (
              <>
                <TreasureMap
                  coordinates={coordinates as Coordinates}
                  treasures={placement}
                  height={380}
                />
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  요청 {count}개 중 <b className="text-teal-200">
                    {placement.length}개
                  </b>{" "}
                  배치됨. 세션 시작 시 방장 디바이스가 다시 랜덤으로 뽑기 때문에
                  실제 위치는 매번 달라져요. 경로 길이가 짧으면 최소 간격(150m)
                  때문에 요청보다 적게 나올 수 있어요.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-gray-500 px-1">
                {hasRoute
                  ? "배치 가능한 지점이 없어요. (경로가 너무 짧거나 보물 개수가 0입니다)"
                  : "경로 좌표가 없어서 미리보기를 띄울 수 없어요."}
              </p>
            )}
          </div>
        ) : null}
      </div>
      )}

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 inline-flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{success}</span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty}
        className="w-full h-10 rounded-lg bg-teal-400 hover:bg-teal-300 disabled:bg-teal-400/30 text-[#0b1f1c] text-sm font-semibold inline-flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        보물 설정 저장
      </button>
    </section>
  );
}
