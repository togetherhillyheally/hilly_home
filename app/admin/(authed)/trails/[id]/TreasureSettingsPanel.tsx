"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Gem,
  Loader2,
  Save,
} from "lucide-react";
import {
  DEFAULT_TREASURE_REWARD_POOL,
  validateTreasureCount,
  validateTreasureRewardPool,
  type TreasureReward,
} from "@/lib/trail-treasure";
import TreasureSettingsFields from "./TreasureSettingsFields";

type Props = {
  trailId: string;
  initialCount: number;
  initialPool: TreasureReward[];
};

function cloneDefaults(): TreasureReward[] {
  return DEFAULT_TREASURE_REWARD_POOL.map((r) => ({ ...r }));
}

export default function TreasureSettingsPanel({
  trailId,
  initialCount,
  initialPool,
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
