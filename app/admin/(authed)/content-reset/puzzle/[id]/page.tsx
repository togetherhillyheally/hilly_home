import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Map as MapIcon, Puzzle as PuzzleIcon } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import ResetUserList, { type ProgressRow } from "./ResetUserList";
import ResetTrailUserList, { type TrailProgressRow } from "./ResetTrailUserList";

export const dynamic = "force-dynamic";

type View = "puzzle" | "trail";

type PuzzleDetail = {
  id: string;
  name: string;
  series_name: string | null;
  trail_id: string | null;
  total_pieces: number;
  is_active: boolean;
};

type TrailDetail = { id: string; name: string; series_name: string | null };

type CellRow = { user_id: string; cell_index: number; at: string };
type Completion = { user_id: string; completed_at: string };
type ProfileMini = {
  id: string;
  nickname: string | null;
  phone_number: string | null;
};
type TierRow = { user_id: string; current_tier: number };
type HistoryRow = { user_id: string; pieces: number; earned_at: string };

async function buildPuzzleRows(puzzleId: string): Promise<ProgressRow[]> {
  const [treasureCellRes, revealRows, drawnRows, completionRows] =
    await Promise.all([
      adminList<{ cell_index: number }>(
        `puzzle_treasures?select=cell_index&puzzle_id=eq.${puzzleId}`,
        { from: 0, to: 4999 }
      ),
      adminList<{ user_id: string; cell_index: number; revealed_at: string }>(
        `puzzle_reveals?select=user_id,cell_index,revealed_at&puzzle_id=eq.${puzzleId}`,
        { from: 0, to: 9999 }
      ),
      adminList<{ user_id: string; cell_index: number; drawn_at: string }>(
        `puzzle_drawn_pieces?select=user_id,cell_index,drawn_at&puzzle_id=eq.${puzzleId}`,
        { from: 0, to: 9999 }
      ),
      adminList<Completion>(
        `puzzle_completions?select=user_id,completed_at&puzzle_id=eq.${puzzleId}&order=completed_at.desc`,
        { from: 0, to: 4999 }
      ),
    ]);

  // 지도(보물박스)에서만 얻을 수 있는 칸 — draw_puzzle_piece(씨앗 뽑기)는 이 칸들을 제외하고 뽑음
  const treasureCellSet = new Set(treasureCellRes.rows.map((r) => r.cell_index));

  // 초기화 대상과 일치시키기 위해, 목록도 "씨앗으로 뽑은 조각"만으로 판단 —
  // 지도(보물)로만 얻은 유저는 이 화면에서 초기화할 게 없으므로 목록에 아예 안 보이게 함
  const cells: CellRow[] = [
    ...revealRows.rows
      .filter((r) => !treasureCellSet.has(r.cell_index))
      .map((r) => ({
        user_id: r.user_id,
        cell_index: r.cell_index,
        at: r.revealed_at,
      })),
    ...drawnRows.rows
      .filter((r) => !treasureCellSet.has(r.cell_index))
      .map((r) => ({
        user_id: r.user_id,
        cell_index: r.cell_index,
        at: r.drawn_at,
      })),
  ];

  type Agg = {
    pieceCells: Set<number>;
    cycles: number;
    latest: string;
  };
  const byUser = new Map<string, Agg>();
  const bump = (uid: string, at: string) => {
    const cur = byUser.get(uid);
    if (!cur) {
      byUser.set(uid, {
        pieceCells: new Set(),
        cycles: 0,
        latest: at,
      });
    } else if (at > cur.latest) {
      cur.latest = at;
    }
    return byUser.get(uid)!;
  };
  for (const c of cells) {
    const a = bump(c.user_id, c.at);
    a.pieceCells.add(c.cell_index);
  }
  // 완료 이력은 표시용 부가정보일 뿐 — 씨앗 조각이 없는 유저를 새로 목록에 추가하진 않음
  for (const c of completionRows.rows) {
    const a = byUser.get(c.user_id);
    if (!a) continue;
    a.cycles += 1;
    if (c.completed_at > a.latest) a.latest = c.completed_at;
  }

  const userIds = Array.from(byUser.keys());

  const [profileRes, tierRes] = await Promise.all([
    userIds.length > 0
      ? adminList<ProfileMini>(
          `profiles?select=id,nickname,phone_number&id=in.(${userIds.join(",")})`
        )
      : Promise.resolve({ rows: [] as ProfileMini[], total: 0 }),
    userIds.length > 0
      ? adminList<TierRow>(
          `user_puzzle_tiers?select=user_id,current_tier&puzzle_id=eq.${puzzleId}&user_id=in.(${userIds.join(",")})`
        )
      : Promise.resolve({ rows: [] as TierRow[], total: 0 }),
  ]);
  const profileMap = new Map(profileRes.rows.map((p) => [p.id, p]));
  const tierMap = new Map(tierRes.rows.map((t) => [t.user_id, t.current_tier]));

  return userIds
    .map((uid) => {
      const a = byUser.get(uid)!;
      const prof = profileMap.get(uid);
      return {
        user_id: uid,
        nickname: prof?.nickname ?? null,
        phone_number: prof?.phone_number ?? null,
        pieces_found: a.pieceCells.size,
        cycles: a.cycles,
        current_tier: tierMap.get(uid) ?? null,
        latest_activity_at: a.latest,
      };
    })
    .sort((x, y) => y.latest_activity_at.localeCompare(x.latest_activity_at));
}

async function buildTrailRows(
  trailId: string,
  puzzleId: string | null
): Promise<TrailProgressRow[]> {
  const [{ rows: history }, { rows: treasureIds }, treasureCellRes] =
    await Promise.all([
      adminList<HistoryRow>(
        `garden_trail_seed_history?select=user_id,pieces,earned_at&trail_id=eq.${trailId}&order=earned_at.desc`,
        { from: 0, to: 4999 }
      ),
      adminList<{ id: string }>(
        `puzzle_treasures?trail_id=eq.${trailId}&select=id`,
        { from: 0, to: 4999 }
      ),
      puzzleId
        ? adminList<{ cell_index: number }>(
            `puzzle_treasures?select=cell_index&puzzle_id=eq.${puzzleId}`,
            { from: 0, to: 4999 }
          )
        : Promise.resolve({ rows: [] as { cell_index: number }[], total: 0 }),
    ]);

  const { rows: treasureCollections } =
    treasureIds.length > 0
      ? await adminList<{ user_id: string; collected_at: string }>(
          `user_puzzle_treasures?select=user_id,collected_at&treasure_id=in.(${treasureIds
            .map((t) => t.id)
            .join(",")})`,
          { from: 0, to: 9999 }
        )
      : { rows: [] as { user_id: string; collected_at: string }[] };

  // 이 트레일에 연결된 퍼즐의 "지도에서 찾은 조각"(보물 칸) — 코스 초기화가 같이 다루는 범위
  const treasureCellSet = new Set(treasureCellRes.rows.map((r) => r.cell_index));
  const { rows: rawMapCellRows } = puzzleId
    ? await adminList<{
        user_id: string;
        cell_index: number;
        revealed_at: string;
      }>(
        `puzzle_reveals?select=user_id,cell_index,revealed_at&puzzle_id=eq.${puzzleId}`,
        { from: 0, to: 9999 }
      )
    : {
        rows: [] as {
          user_id: string;
          cell_index: number;
          revealed_at: string;
        }[],
      };
  const mapCellRows = rawMapCellRows
    .filter((r) => treasureCellSet.has(r.cell_index))
    .map((r) => ({
      user_id: r.user_id,
      cell_index: r.cell_index,
      at: r.revealed_at,
    }));

  const byUser = new Map<
    string,
    {
      walk_count: number;
      total_pieces: number;
      treasures_found: number;
      map_pieces: Set<string>;
      latest_earned_at: string;
    }
  >();
  const touch = (uid: string, at: string) => {
    const cur = byUser.get(uid);
    if (!cur) {
      byUser.set(uid, {
        walk_count: 0,
        total_pieces: 0,
        treasures_found: 0,
        map_pieces: new Set(),
        latest_earned_at: at,
      });
    } else if (at > cur.latest_earned_at) {
      cur.latest_earned_at = at;
    }
    return byUser.get(uid)!;
  };
  for (const h of history) {
    const a = touch(h.user_id, h.earned_at);
    a.walk_count += 1;
    a.total_pieces += h.pieces;
  }
  for (const t of treasureCollections) {
    const a = touch(t.user_id, t.collected_at);
    a.treasures_found += 1;
  }
  for (const m of mapCellRows) {
    const a = touch(m.user_id, m.at);
    a.map_pieces.add(`${m.cell_index}`);
  }
  const userIds = Array.from(byUser.keys());

  const { rows: profiles } =
    userIds.length > 0
      ? await adminList<ProfileMini>(
          `profiles?select=id,nickname,phone_number&id=in.(${userIds.join(",")})`
        )
      : { rows: [] as ProfileMini[] };
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return userIds
    .map((uid) => {
      const h = byUser.get(uid)!;
      const prof = profileMap.get(uid);
      return {
        user_id: uid,
        nickname: prof?.nickname ?? null,
        phone_number: prof?.phone_number ?? null,
        walk_count: h.walk_count,
        total_pieces: h.total_pieces,
        treasures_found: h.treasures_found,
        map_pieces_found: h.map_pieces.size,
        latest_earned_at: h.latest_earned_at,
      };
    })
    .sort((a, b) => b.latest_earned_at.localeCompare(a.latest_earned_at));
}

export default async function ContentResetPuzzleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const { rows: puzzles } = await adminList<PuzzleDetail>(
    `puzzles?id=eq.${id}&select=id,name,series_name,trail_id,total_pieces,is_active&limit=1`
  );
  const puzzle = puzzles[0];
  if (!puzzle) notFound();

  const { rows: trailRows } = puzzle.trail_id
    ? await adminList<TrailDetail>(
        `trails?id=eq.${puzzle.trail_id}&select=id,name,series_name&limit=1`
      )
    : { rows: [] as TrailDetail[] };
  const trail = trailRows[0] ?? null;

  const view: View = trail && sp.view === "trail" ? "trail" : "puzzle";

  const puzzleRows = view === "puzzle" ? await buildPuzzleRows(puzzle.id) : [];
  const trailRowsData =
    view === "trail" && trail
      ? await buildTrailRows(trail.id, puzzle.id)
      : [];

  return (
    <main className="p-6 lg:p-10">
      <div className="mb-6">
        <Link
          href="/admin/content-reset"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> 컨텐츠 초기화 목록
        </Link>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-1">
            <PuzzleIcon className="h-4 w-4 text-orange-300" />
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              {puzzle.name}
            </h1>
            {puzzle.is_active ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium">
                활성
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-gray-500 text-[10px] font-medium">
                비활성
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
            {puzzle.series_name ? <span>시리즈 {puzzle.series_name}</span> : null}
            <span>조각 {puzzle.total_pieces}개</span>
            {trail ? (
              <span className="inline-flex items-center gap-1">
                <MapIcon className="h-3 w-3" />
                연결된 코스지도: {trail.name}
              </span>
            ) : (
              <span className="text-gray-600">연결된 코스지도 없음</span>
            )}
          </div>
        </div>
      </div>

      {trail ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Link
            href={`/admin/content-reset/puzzle/${puzzle.id}?view=puzzle`}
            className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
              view === "puzzle"
                ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
                : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
            }`}
          >
            <PuzzleIcon className="h-4 w-4" />
            퍼즐 초기화
          </Link>
          <Link
            href={`/admin/content-reset/puzzle/${puzzle.id}?view=trail`}
            className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
              view === "trail"
                ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
                : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
            }`}
          >
            <MapIcon className="h-4 w-4" />
            퍼즐지도 초기화
          </Link>
        </div>
      ) : null}

      {view === "puzzle" ? (
        <>
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
            퍼즐 진행 유저 ({puzzleRows.length}명) — 씨앗으로 뽑은 조각이 1개
            이상인 유저만 표시 (지도에서만 얻은 유저는 초기화할 게 없어 제외)
            · 체크 후 씨앗 조각만 초기화
          </h2>
          <ResetUserList puzzleId={puzzle.id} rows={puzzleRows} />
        </>
      ) : trail ? (
        <>
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
            코스 진행 유저 ({trailRowsData.length}명) — 완주, 보물 수집,
            지도 조각 중 1개 이상 시 표시 · 체크 후 진행 초기화
          </h2>
          <ResetTrailUserList trailId={trail.id} rows={trailRowsData} />
        </>
      ) : null}
    </main>
  );
}
