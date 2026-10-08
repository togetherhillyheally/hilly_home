"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Dices,
  Gem,
  Loader2,
  Map as MapIcon,
  Save,
} from "lucide-react";
import {
  DEFAULT_TREASURE_REWARD_POOL,
  validateTreasureCount,
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
  coordinates: Coordinates | null;
};

function cloneDefaults(): TreasureReward[] {
  return DEFAULT_TREASURE_REWARD_POOL.map((r) => ({ ...r }));
}

export default function TreasureSettingsPanel({
  trailId,
  initialCount,
  initialPool,
  coordinates,
}: Props) {
  const router = useRouter();
  const [count, setCount] = useState<number>(initialCount);
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
    if (pool.length !== (initialPool ?? []).length) return true;
    return JSON.stringify(pool) !== JSON.stringify(initialPool ?? []);
  }, [count, pool, initialCount, initialPool]);

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
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            treasure_count: countR.value,
            treasure_reward_pool: poolR.value,
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
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/[0.03] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gem className="h-4 w-4 text-amber-300" />
        <h2 className="text-sm font-semibold text-amber-100">보물지도 설정</h2>
      </div>

      <TreasureSettingsFields
        count={count}
        setCount={setCount}
        pool={pool}
        setPool={setPool}
        onResetDefaults={resetDefaults}
      />

      {/* 배치 미리보기 — 실제 세션은 매번 새로 뽑히므로 "샘플" 임을 명시 */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            disabled={!hasRoute}
            className="inline-flex items-center gap-2 text-xs text-gray-200 hover:text-white disabled:opacity-40"
          >
            <MapIcon className="h-3.5 w-3.5 text-amber-300" />
            경로상 배치 미리보기
            <span className="text-[10px] text-gray-500">
              ({showPreview ? "접기" : "펼치기"})
            </span>
          </button>
          {showPreview ? (
            <button
              type="button"
              onClick={reroll}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] text-amber-200 hover:text-amber-100 hover:bg-white/[0.05]"
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
                  요청 {count}개 중 <b className="text-amber-200">
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
        className="w-full h-10 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/30 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
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
