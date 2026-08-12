import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import PuzzleEditForm, { type PuzzleFull } from "./PuzzleEditForm";
import TreasurePanel from "./TreasurePanel";
import BrandSeedPanel from "./BrandSeedPanel";
import PuzzleTabs from "./PuzzleTabs";

export const dynamic = "force-dynamic";

export default async function PuzzleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows: puzzleRows } = await adminList<PuzzleFull>(
    `puzzles?id=eq.${id}&select=id,name,description,total_pieces,cover_image_url,image_url,is_active,grid_rows,grid_cols,reward_description,trail_id,base_tier,event_starts_at,event_ends_at,puzzle_type,series_name,collab_title,collab_description,created_at`
  );
  const puzzle = puzzleRows[0];
  if (!puzzle) notFound();

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <Link
          href="/admin/puzzles"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          퍼즐 목록
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {puzzle.name}
          </h1>
          {puzzle.is_active ? (
            <span className="inline-flex items-center px-2 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
              활성
            </span>
          ) : (
            <span className="inline-flex items-center px-2 h-6 rounded-md bg-white/[0.06] border border-white/10 text-gray-400 text-[11px] font-medium">
              비활성
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 font-mono">{puzzle.id}</p>
      </header>

      <PuzzleTabs
        settings={<PuzzleEditForm puzzle={puzzle} />}
        cert={
          <>
            <BrandSeedPanel puzzleId={puzzle.id} />
            <TreasurePanel
              puzzleId={puzzle.id}
              trailId={puzzle.trail_id}
              seriesName={puzzle.series_name}
              totalPieces={puzzle.total_pieces}
            />
          </>
        }
      />
    </main>
  );
}
