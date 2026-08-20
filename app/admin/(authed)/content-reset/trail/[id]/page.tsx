import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Map as MapIcon, Puzzle as PuzzleIcon } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import ResetTrailUserList, { type TrailProgressRow } from "./ResetTrailUserList";

export const dynamic = "force-dynamic";

type TrailDetail = {
  id: string;
  name: string;
  series_name: string | null;
  is_active: boolean;
};

type HistoryRow = {
  user_id: string;
  pieces: number;
  earned_at: string;
};

type ProfileMini = {
  id: string;
  nickname: string | null;
  phone_number: string | null;
};

export default async function ContentResetTrailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows: trails } = await adminList<TrailDetail>(
    `trails?id=eq.${id}&select=id,name,series_name,is_active&limit=1`
  );
  const trail = trails[0];
  if (!trail) notFound();

  const [{ rows: puzzleRows }, { rows: history }] = await Promise.all([
    adminList<{ id: string; name: string }>(
      `puzzles?trail_id=eq.${id}&select=id,name&limit=1`
    ),
    adminList<HistoryRow>(
      `garden_trail_seed_history?select=user_id,pieces,earned_at&trail_id=eq.${id}&order=earned_at.desc`,
      { from: 0, to: 4999 }
    ),
  ]);
  const puzzle = puzzleRows[0] ?? null;

  const byUser = new Map<
    string,
    { walk_count: number; total_pieces: number; latest_earned_at: string }
  >();
  for (const h of history) {
    const cur = byUser.get(h.user_id);
    if (!cur) {
      byUser.set(h.user_id, {
        walk_count: 1,
        total_pieces: h.pieces,
        latest_earned_at: h.earned_at,
      });
    } else {
      cur.walk_count += 1;
      cur.total_pieces += h.pieces;
    }
  }
  const userIds = Array.from(byUser.keys());

  const { rows: profiles } =
    userIds.length > 0
      ? await adminList<ProfileMini>(
          `profiles?select=id,nickname,phone_number&id=in.(${userIds.join(",")})`
        )
      : { rows: [] as ProfileMini[] };
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const rows: TrailProgressRow[] = userIds
    .map((uid) => {
      const h = byUser.get(uid)!;
      const prof = profileMap.get(uid);
      return {
        user_id: uid,
        nickname: prof?.nickname ?? null,
        phone_number: prof?.phone_number ?? null,
        walk_count: h.walk_count,
        total_pieces: h.total_pieces,
        latest_earned_at: h.latest_earned_at,
      };
    })
    .sort((a, b) => b.latest_earned_at.localeCompare(a.latest_earned_at));

  return (
    <main className="p-6 lg:p-10">
      <div className="mb-6">
        <Link
          href="/admin/content-reset?tab=trail"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> 컨텐츠 초기화 목록
        </Link>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-1">
            <MapIcon className="h-4 w-4 text-sky-300" />
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              {trail.name}
            </h1>
            {trail.is_active ? (
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
            {trail.series_name ? <span>시리즈 {trail.series_name}</span> : null}
            {puzzle ? (
              <Link
                href={`/admin/content-reset/puzzle/${puzzle.id}`}
                className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200"
              >
                <PuzzleIcon className="h-3 w-3" />
                연결된 퍼즐 초기화: {puzzle.name}
              </Link>
            ) : (
              <span className="text-gray-600">연결된 퍼즐 없음</span>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
        코스 완주 유저 ({rows.length}명) — 체크 후 진행 초기화
      </h2>
      <ResetTrailUserList trailId={trail.id} rows={rows} />
    </main>
  );
}
