import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import PuzzleEditForm, {
  type PuzzleFull,
  type SpeciesMini,
} from "./PuzzleEditForm";

export const dynamic = "force-dynamic";

export default async function PuzzleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ rows: puzzleRows }, { rows: allSpecies }, { rows: allLinks }] =
    await Promise.all([
      adminList<PuzzleFull>(
        `puzzles?id=eq.${id}&select=id,name,description,total_pieces,cover_image_url,image_url,is_active,grid_rows,grid_cols,reward_description,trail_id,base_tier,puzzle_type,series_name,collab_title,collab_description,created_at`
      ),
      adminList<SpeciesMini>(
        // 완성 보상 후보: is_hidden 제외, product 제외 (하늘·식물·동물만)
        "garden_species?select=id,key,name,category,zone,svg_key,is_brand,is_hidden,is_published,tint&is_hidden=eq.false&category=neq.product&order=sort_order.asc.nullslast,key.asc",
        { from: 0, to: 999 }
      ),
      // 전체 보상 연결 — 이 퍼즐의 현재 연결 + 타 퍼즐 선점 표시용
      adminList<{
        species_id: string;
        puzzle_id: string;
        puzzles: { name: string } | null;
      }>(
        `garden_puzzle_rewards?select=species_id,puzzle_id,puzzles(name)`,
        { from: 0, to: 999 }
      ),
    ]);
  const puzzle = puzzleRows[0];
  if (!puzzle) notFound();

  const initialGrantSpeciesId =
    allLinks.find((l) => l.puzzle_id === id)?.species_id ?? null;
  // 다른 퍼즐이 선점한 종 → 퍼즐명 매핑 (선택 비활성 표시용)
  const linkedByOthers: Record<string, string> = {};
  for (const l of allLinks) {
    if (l.puzzle_id !== id) {
      linkedByOthers[l.species_id] = l.puzzles?.name ?? "다른 퍼즐";
    }
  }

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

      <PuzzleEditForm
        puzzle={puzzle}
        allSpecies={allSpecies}
        initialGrantSpeciesId={initialGrantSpeciesId}
        linkedByOthers={linkedByOthers}
      />
    </main>
  );
}
