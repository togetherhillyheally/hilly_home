"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { HAS_FRONT_VIEW, PLANT_SVG } from "../users/[id]/garden-svgs";

type Props = {
  svgKey: string;
  category: string;
  maxStage: number;
  stageNames: string[];
  speciesName: string;
  tint?: string | null;
};

/** 식물처럼 씨앗(흙 둔덕)에서 자라는 카테고리 */
const SEED_CATEGORIES = new Set(["flower", "bush", "mushroom", "tree"]);

function renderStage(
  render: (
    w: number,
    g?: number,
    front?: boolean,
    tint?: string | null
  ) => React.ReactNode,
  category: string,
  idx: number,
  growth: number,
  front = false,
  tint: string | null = null
): React.ReactNode {
  if (idx === 0 && SEED_CATEGORIES.has(category)) {
    return PLANT_SVG.Seed(0);
  }
  // 동물/구름/제품 등: stage 0 도 자신의 SVG 로 (g 를 아주 작게 = 아기)
  return render(0, Math.max(0.05, Math.min(1, growth)), front, tint);
}

export default function StageStrip({
  svgKey,
  category,
  maxStage,
  stageNames,
  speciesName,
  tint = null,
}: Props) {
  const render = PLANT_SVG[svgKey] ?? PLANT_SVG.Sprout;
  const stageCount = Math.max(1, maxStage) + 1;
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const stageGrowth = (idx: number) => (maxStage > 0 ? idx / maxStage : 1);
  const stageLabel = (idx: number) => stageNames[idx] ?? `stage ${idx}`;

  return (
    <>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${stageCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: stageCount }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIdx(i)}
            title={stageLabel(i)}
            className="aspect-square rounded bg-gradient-to-b from-sky-900/15 to-emerald-900/10 border border-white/5 hover:border-emerald-500/40 flex items-end justify-center transition-colors"
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMax meet"
              className="w-full h-full pointer-events-none"
            >
              {renderStage(render, category, i, stageGrowth(i), false, tint)}
            </svg>
          </button>
        ))}
      </div>

      {openIdx !== null ? (
        <StageModal
          svgKey={svgKey}
          category={category}
          maxStage={maxStage}
          stageNames={stageNames}
          speciesName={speciesName}
          tint={tint}
          idx={openIdx}
          onIdxChange={setOpenIdx}
          onClose={() => setOpenIdx(null)}
        />
      ) : null}
    </>
  );
}

function StageModal({
  svgKey,
  category,
  maxStage,
  stageNames,
  speciesName,
  tint = null,
  idx,
  onIdxChange,
  onClose,
}: {
  svgKey: string;
  category: string;
  maxStage: number;
  stageNames: string[];
  speciesName: string;
  tint?: string | null;
  idx: number;
  onIdxChange: (i: number) => void;
  onClose: () => void;
}) {
  const render = PLANT_SVG[svgKey] ?? PLANT_SVG.Sprout;
  const stageCount = Math.max(1, maxStage) + 1;
  const growth = maxStage > 0 ? idx / maxStage : 1;
  const label = stageNames[idx] ?? `stage ${idx}`;
  const hasFront = HAS_FRONT_VIEW.has(svgKey);
  const [front, setFront] = useState(false);

  // 키보드 네비 (← → esc)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && idx > 0) onIdxChange(idx - 1);
      else if (e.key === "ArrowRight" && idx < stageCount - 1)
        onIdxChange(idx + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, stageCount, onClose, onIdxChange]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f17] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div>
            <div className="text-sm font-semibold text-white">
              {speciesName}
            </div>
            <div className="text-xs text-emerald-300 mt-0.5">{label}</div>
          </div>
          <div className="flex items-center gap-2">
            {hasFront ? (
              <div className="flex rounded-lg border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFront(false)}
                  className={`px-2.5 h-7 text-[11px] font-medium transition-colors ${
                    !front
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-white/[0.04] text-gray-400 hover:text-white"
                  }`}
                >
                  옆
                </button>
                <button
                  type="button"
                  onClick={() => setFront(true)}
                  className={`px-2.5 h-7 text-[11px] font-medium transition-colors ${
                    front
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-white/[0.04] text-gray-400 hover:text-white"
                  }`}
                >
                  앞
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-md hover:bg-white/10 text-gray-400 inline-flex items-center justify-center"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative aspect-square bg-gradient-to-b from-sky-900/40 via-sky-800/20 to-emerald-900/40 flex items-end justify-center">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMax meet"
            className="w-full h-full"
          >
            {renderStage(render, category, idx, growth, front, tint)}
          </svg>

          {/* 좌/우 네비 */}
          {idx > 0 ? (
            <button
              type="button"
              onClick={() => onIdxChange(idx - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white inline-flex items-center justify-center"
              aria-label="이전 단계"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          {idx < stageCount - 1 ? (
            <button
              type="button"
              onClick={() => onIdxChange(idx + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white inline-flex items-center justify-center"
              aria-label="다음 단계"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* 하단: 단계 인디케이터 */}
        <div className="px-5 py-3 border-t border-white/5">
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: stageCount }, (_, i) => {
              const active = i === idx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onIdxChange(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    active ? "w-6 bg-emerald-400" : "w-1.5 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`단계 ${i}`}
                />
              );
            })}
          </div>
          <div className="mt-2 text-center text-[11px] text-gray-500">
            {idx + 1} / {stageCount} · ← → 로 이동
          </div>
        </div>
      </div>
    </div>
  );
}
