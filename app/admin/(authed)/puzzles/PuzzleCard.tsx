"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Sprout } from "lucide-react";
import { PLANT_SVG } from "../users/[id]/garden-svgs";

export type RewardSpecies = {
  id: string;
  name: string;
  category: string;
  svg_key: string;
  tint: string | null;
};

// puzzle_type 은 셀 이미지 노출 방식 (브랜드 연결 여부와 무관)
const PUZZLE_TYPE_LABELS: Record<string, string> = {
  mystery: "미스터리 (거의 안 보임)",
  hint: "힌트 (흐린 가이드)",
  brand: "원본 노출",
};

export type PuzzleRow = {
  id: string;
  name: string;
  description: string | null;
  total_pieces: number;
  cover_image_url: string | null;
  image_url: string | null;
  is_active: boolean;
  grid_rows: number;
  grid_cols: number;
  reward_description: string | null;
  trail_id: string | null;
  series_name: string | null;
  base_tier: number;
  puzzle_type: string | null;
  created_at: string;
};

export default function PuzzleCard({
  puzzle,
  rewards,
  trailName,
}: {
  puzzle: PuzzleRow;
  rewards: RewardSpecies[];
  trailName: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/puzzles/${puzzle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !puzzle.is_active }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(data.error ?? "변경 실패");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      alert("네트워크 오류");
    } finally {
      setPending(false);
    }
  };

  const cover = puzzle.cover_image_url ?? puzzle.image_url;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-emerald-500/30 transition-colors group">
      <Link
        href={`/admin/puzzles/${puzzle.id}`}
        className="block aspect-[4/3] bg-white/[0.04] relative"
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={puzzle.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
            이미지 없음
          </div>
        )}
        {!puzzle.is_active ? (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="px-2 py-1 rounded-md bg-gray-900/80 text-gray-300 text-[11px] border border-white/10">
              비활성
            </span>
          </div>
        ) : null}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur text-white text-xs font-medium">
            <Pencil className="h-3.5 w-3.5" /> 편집
          </span>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            href={`/admin/puzzles/${puzzle.id}`}
            className="text-base font-semibold text-white truncate hover:text-emerald-300 transition-colors flex-1 min-w-0"
          >
            {puzzle.name}
          </Link>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={puzzle.is_active}
              disabled={pending}
              onChange={toggle}
            />
            <span className="w-9 h-5 rounded-full bg-white/10 peer-checked:bg-orange-500/80 transition-colors relative">
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  puzzle.is_active ? "translate-x-4" : ""
                }`}
              />
            </span>
            {pending ? (
              <Loader2 className="ml-1.5 h-3 w-3 animate-spin text-gray-500" />
            ) : null}
          </label>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">격자</span>
            <span className="text-gray-200 font-mono">
              {puzzle.grid_rows} × {puzzle.grid_cols}
            </span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">총 조각</span>
            <span className="text-gray-200">{puzzle.total_pieces}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">기본 티어</span>
            <span className="text-gray-200">{puzzle.base_tier}</span>
            {puzzle.puzzle_type ? (
              <>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500">노출</span>
                <span className="text-gray-200">
                  {PUZZLE_TYPE_LABELS[puzzle.puzzle_type] ?? puzzle.puzzle_type}
                </span>
              </>
            ) : null}
          </div>
          {/* 브랜드 연결 — 트레일 또는 시리즈에 연결된 퍼즐만 */}
          {puzzle.series_name || puzzle.trail_id ? (
            <div className="flex items-center gap-1.5 pt-1">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] font-medium">
                브랜드 연결
              </span>
              <span className="text-gray-300 truncate">
                {puzzle.series_name
                  ? `시리즈 · ${puzzle.series_name}`
                  : trailName
                    ? `트레일 · ${trailName}`
                    : `트레일 · ${puzzle.trail_id!.slice(0, 8)}…`}
              </span>
            </div>
          ) : null}
          {puzzle.reward_description ? (
            <div className="pt-2 mt-2 border-t border-white/5">
              <span className="text-gray-500">보상</span>{" "}
              <span className="text-gray-200">{puzzle.reward_description}</span>
            </div>
          ) : null}
          {/* 완성 보상 정원 종 */}
          {rewards.length > 0 ? (
            <div className="pt-2 mt-2 border-t border-white/5">
              <div className="flex items-center gap-1 text-gray-500 mb-1.5">
                <Sprout className="h-3 w-3 text-emerald-300" />
                정원 보상
              </div>
              <div className="flex flex-wrap gap-1">
                {rewards.map((sp) => {
                  const render = PLANT_SVG[sp.svg_key] ?? PLANT_SVG.Sprout;
                  // 동물은 하단 절반만 쓰므로 좁은 viewBox 로 확대 (hilly_rn 과 동일)
                  const vb =
                    sp.category === "animal" ? "26 42 48 50" : "16 12 68 78";
                  return (
                    <div
                      key={sp.id}
                      title={sp.name}
                      className="w-9 h-9 rounded-md bg-gradient-to-b from-sky-900/20 to-emerald-900/15 border border-white/10 flex items-end justify-center overflow-hidden"
                    >
                      <svg
                        viewBox={vb}
                        preserveAspectRatio="xMidYMax meet"
                        className="w-full h-full"
                      >
                        {render(0, 1, false, sp.tint)}
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
