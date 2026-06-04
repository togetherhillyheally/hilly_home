"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
  base_tier: number;
  puzzle_type: string | null;
  created_at: string;
};

export default function PuzzleCard({ puzzle }: { puzzle: PuzzleRow }) {
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
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="aspect-[4/3] bg-white/[0.04] relative">
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
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-semibold text-white truncate">
            {puzzle.name}
          </h3>
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
                <span className="text-gray-500">타입</span>
                <span className="text-gray-200">{puzzle.puzzle_type}</span>
              </>
            ) : null}
          </div>
          {puzzle.reward_description ? (
            <div className="pt-2 mt-2 border-t border-white/5">
              <span className="text-gray-500">보상</span>{" "}
              <span className="text-gray-200">{puzzle.reward_description}</span>
            </div>
          ) : null}
          {puzzle.trail_id ? (
            <div className="pt-1">
              <span className="text-gray-500">트레일 연결</span>{" "}
              <code className="text-[10px] text-gray-400">
                {puzzle.trail_id.slice(0, 8)}…
              </code>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
