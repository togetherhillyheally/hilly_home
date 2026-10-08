"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  TREASURE_COUNT_MAX,
  TREASURE_COUNT_MIN,
  TREASURE_COUNT_PRESETS,
  TREASURE_REWARD_KIND_LABELS,
  TREASURE_REWARD_KINDS,
  totalWeight,
  type TreasureReward,
  type TreasureRewardKind,
} from "@/lib/trail-treasure";

type Props = {
  count: number;
  setCount: (n: number) => void;
  pool: TreasureReward[];
  setPool: React.Dispatch<React.SetStateAction<TreasureReward[]>>;
  onResetDefaults: () => void;
  disabled?: boolean;
};

export default function TreasureSettingsFields({
  count,
  setCount,
  pool,
  setPool,
  onResetDefaults,
  disabled,
}: Props) {
  const sumWeight = totalWeight(pool);

  const patchRow = (idx: number, patch: Partial<TreasureReward>) => {
    setPool((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const removeRow = (idx: number) => {
    if (pool.length <= 1) return;
    setPool((prev) => prev.filter((_, i) => i !== idx));
  };
  const addRow = () => {
    setPool((prev) => [
      ...prev,
      { kind: "seed", value: 1, label: "씨앗 1개", weight: 1 },
    ]);
  };

  return (
    <div className="space-y-4">
      {/* 보물 개수 */}
      <div>
        <label className="block text-xs text-gray-300 mb-1.5">
          보물 개수 <span className="text-gray-500">(세션마다 숨길 보물의 수)</span>
        </label>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {TREASURE_COUNT_PRESETS.map((p) => {
            const active = count === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setCount(p)}
                disabled={disabled}
                className={`h-8 px-3 rounded-md text-xs font-semibold border transition disabled:opacity-50 ${
                  active
                    ? "bg-amber-500/20 border-amber-400/60 text-amber-100"
                    : "bg-white/[0.04] border-white/10 text-gray-300 hover:text-white"
                }`}
              >
                {p}개
              </button>
            );
          })}
          <input
            type="number"
            min={TREASURE_COUNT_MIN}
            max={TREASURE_COUNT_MAX}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 0)}
            disabled={disabled}
            className="w-20 h-8 px-2 ml-2 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs text-right tabular-nums focus:outline-none focus:border-amber-400/50 disabled:opacity-50"
          />
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          세션마다 경로 주변에 랜덤으로 숨겨져요. 짧은 코스는 간격(150m) 때문에
          더 적게 나올 수 있어요. (허용: {TREASURE_COUNT_MIN}~{TREASURE_COUNT_MAX})
        </p>
      </div>

      {/* 보상 풀 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-300">
            보상 풀{" "}
            <span className="text-gray-500">
              (가중치 랜덤 · 합계 {sumWeight})
            </span>
          </label>
          <button
            type="button"
            onClick={onResetDefaults}
            disabled={disabled}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] text-gray-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" /> 기본값
          </button>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-white/[0.03] text-gray-500">
              <tr>
                <th className="px-2 py-1.5 text-left w-[90px]">종류</th>
                <th className="px-2 py-1.5 text-right w-[70px]">수량</th>
                <th className="px-2 py-1.5 text-left">라벨 (20자 이내)</th>
                <th className="px-2 py-1.5 text-right w-[70px]">가중치</th>
                <th className="px-2 py-1.5 text-right w-[60px]">확률</th>
                <th className="px-2 py-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {pool.map((r, idx) => {
                const pct =
                  sumWeight > 0
                    ? ((r.weight / sumWeight) * 100).toFixed(1)
                    : "—";
                return (
                  <tr key={idx} className="border-t border-white/5 align-middle">
                    <td className="px-2 py-1">
                      <select
                        value={r.kind}
                        onChange={(e) => {
                          const kind = e.target.value as TreasureRewardKind;
                          patchRow(idx, {
                            kind,
                            value:
                              kind === "seed" ? Math.max(1, r.value || 1) : 0,
                          });
                        }}
                        disabled={disabled}
                        className="w-full h-8 px-1 rounded bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400/50 disabled:opacity-50"
                      >
                        {TREASURE_REWARD_KINDS.map((k) => (
                          <option
                            key={k}
                            value={k}
                            className="bg-[#0c0c14]"
                          >
                            {TREASURE_REWARD_KIND_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={r.kind === "seed" ? 1 : 0}
                        max={r.kind === "seed" ? undefined : 0}
                        value={r.value}
                        disabled={disabled || r.kind !== "seed"}
                        onChange={(e) =>
                          patchRow(idx, {
                            value: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-white text-xs text-right tabular-nums focus:outline-none focus:border-amber-400/50 disabled:opacity-40"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        value={r.label}
                        maxLength={20}
                        disabled={disabled}
                        onChange={(e) =>
                          patchRow(idx, { label: e.target.value })
                        }
                        placeholder={
                          r.kind === "seed"
                            ? "씨앗 N개"
                            : r.kind === "prize"
                              ? "예: 스타벅스 쿠폰"
                              : "꽝"
                        }
                        className="w-full h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400/50 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={1}
                        value={r.weight}
                        disabled={disabled}
                        onChange={(e) =>
                          patchRow(idx, {
                            weight: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-white text-xs text-right tabular-nums focus:outline-none focus:border-amber-400/50 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-amber-200 text-xs">
                      {pct}%
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={disabled || pool.length <= 1}
                        className="text-gray-500 hover:text-red-400 disabled:opacity-20 p-1"
                        aria-label="행 삭제"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td colSpan={6} className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={addRow}
                    disabled={disabled}
                    className="text-[11px] text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" /> 보상 추가
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
          세션 시작 시 각 보물에 가중치 랜덤으로 하나씩 배정돼요. 씨앗은 자동 지급,
          상품은 라벨만 표시되고 운영자가 오프라인에서 전달, 꽝은 획득해도 보상 없음.
        </p>
      </div>
    </div>
  );
}
