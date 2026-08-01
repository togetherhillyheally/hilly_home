"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";

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
  trailName,
}: {
  puzzle: PuzzleRow;
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
        </div>
      </div>
    </div>
  );
}
