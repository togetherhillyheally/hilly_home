"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  TREASURE_COUNT_MAX,
  TREASURE_COUNT_MIN,
  TREASURE_COUNT_PRESETS,
  TREASURE_EDIT_KINDS,
  TREASURE_REWARD_KIND_LABELS,
  totalCount,
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
  /** 보물 자리를 직접 찍은 지도 — 개수는 찍은 자리 수로 정해져서 숨김 */
  hideCount?: boolean;
};

export default function TreasureSettingsFields({
  count,
  setCount,
  pool,
  setPool,
  onResetDefaults,
  disabled,
  hideCount,
}: Props) {
  // 배정 합 vs 상자 수 (2026-11-03 개수 기반) — hideCount 면 count 는 자리 수
  const assigned = totalCount(pool);
  const remainder = count - assigned;
  const over = remainder < 0;

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
      { kind: "prize", value: 0, label: "", count: 1 },
    ]);
  };

  return (
    <div className="space-y-4">
      {/* 보물 개수 */}
      {!hideCount && (
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
                    ? "bg-teal-500/20 border-teal-400/60 text-teal-100"
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
            className="w-20 h-8 px-2 ml-2 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs text-right tabular-nums focus:outline-none focus:border-teal-400/50 disabled:opacity-50"
          />
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          세션마다 경로 주변에 랜덤으로 숨겨져요. 짧은 코스는 간격(150m) 때문에
          더 적게 나올 수 있어요. (허용: {TREASURE_COUNT_MIN}~{TREASURE_COUNT_MAX})
        </p>
      </div>
      )}

      {/* 상자에 넣을 보상 — 보상마다 "상자 몇 개" */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-300">
            상자에 넣을 보상{" "}
            <span className={over ? "text-red-300" : "text-gray-500"}>
              {over
                ? `(상자 ${count}개보다 ${-remainder}개 많아요)`
                : remainder > 0
                  ? `(상자 ${count}개 중 ${assigned}개 배정, 나머지 ${remainder}개는 꽝)`
                  : `(상자 ${count}개 모두 배정)`}
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
                <th className="px-2 py-1.5 text-right w-[70px]">씨앗 수량</th>
                <th className="px-2 py-1.5 text-left">라벨 (20자 이내)</th>
                <th className="px-2 py-1.5 text-right w-[80px]">상자 개수</th>
                <th className="px-2 py-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {pool.map((r, idx) => (
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
                      className="w-full h-8 px-1 rounded bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400/50 disabled:opacity-50"
                    >
                      {TREASURE_EDIT_KINDS.map((k) => (
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
                      className="w-full h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-white text-xs text-right tabular-nums focus:outline-none focus:border-teal-400/50 disabled:opacity-40"
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
                        r.kind === "seed" ? "씨앗 N개" : "예: 아메리카노 1잔"
                      }
                      className="w-full h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400/50 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min={1}
                      max={TREASURE_COUNT_MAX}
                      value={r.count}
                      disabled={disabled}
                      onChange={(e) =>
                        patchRow(idx, {
                          count: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full h-8 px-2 rounded bg-white/[0.04] border border-teal-400/40 text-white text-xs text-right tabular-nums focus:outline-none focus:border-teal-400/70 disabled:opacity-50"
                    />
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
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td colSpan={5} className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={addRow}
                    disabled={disabled}
                    className="text-[11px] text-teal-300 hover:text-teal-200 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" /> 보상 추가
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
          세션 시작 시 적은 개수만큼 상자에 섞어 넣어요. 배정하지 않은 상자는 꽝이에요.
          자리별 보상을 정한 상자는 그 보상이 먼저예요. 씨앗은 자동 지급, 상품은 라벨만
          표시되고 운영자가 오프라인에서 전달해요.
        </p>
      </div>
    </div>
  );
}
