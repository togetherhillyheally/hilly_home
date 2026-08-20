import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Map as MapIcon, Puzzle as PuzzleIcon } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import ResetUserList, { type CompletionRow } from "./ResetUserList";

export const dynamic = "force-dynamic";

type PuzzleDetail = {
  id: string;
  name: string;
  series_name: string | null;
  trail_id: string | null;
  total_pieces: number;
  is_active: boolean;
};

type Completion = {
  user_id: string;
  cycle: number;
  completed_at: string;
};

type ProfileMini = {
  id: string;
  nickname: string | null;
  phone_number: string | null;
};

type TierRow = { user_id: string; current_tier: number };

export default async function ContentResetPuzzleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows: puzzles } = await adminList<PuzzleDetail>(
    `puzzles?id=eq.${id}&select=id,name,series_name,trail_id,total_pieces,is_active&limit=1`
  );
  const puzzle = puzzles[0];
  if (!puzzle) notFound();

  const [trailRes, completionRes] = await Promise.all([
    puzzle.trail_id
      ? adminList<{ id: string; name: string }>(
          `trails?id=eq.${puzzle.trail_id}&select=id,name&limit=1`
        )
      : Promise.resolve({ rows: [] as { id: string; name: string }[], total: 0 }),
    adminList<Completion>(
      `puzzle_completions?select=user_id,cycle,completed_at&puzzle_id=eq.${id}&order=completed_at.desc`,
      { from: 0, to: 4999 }
    ),
  ]);
  const trail = trailRes.rows[0] ?? null;

  const byUser = new Map<
    string,
    { cycles: number; latest_completed_at: string }
  >();
  for (const c of completionRes.rows) {
    const cur = byUser.get(c.user_id);
    if (!cur) {
      byUser.set(c.user_id, { cycles: 1, latest_completed_at: c.completed_at });
    } else {
      cur.cycles += 1;
    }
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
          `user_puzzle_tiers?select=user_id,current_tier&puzzle_id=eq.${id}&user_id=in.(${userIds.join(",")})`
        )
      : Promise.resolve({ rows: [] as TierRow[], total: 0 }),
  ]);
  const profileMap = new Map(profileRes.rows.map((p) => [p.id, p]));
  const tierMap = new Map(tierRes.rows.map((t) => [t.user_id, t.current_tier]));

  const rows: CompletionRow[] = userIds
    .map((uid) => {
      const c = byUser.get(uid)!;
      const prof = profileMap.get(uid);
      return {
        user_id: uid,
        nickname: prof?.nickname ?? null,
        phone_number: prof?.phone_number ?? null,
        cycles: c.cycles,
        latest_completed_at: c.latest_completed_at,
        current_tier: tierMap.get(uid) ?? null,
      };
    })
    .sort((a, b) => b.latest_completed_at.localeCompare(a.latest_completed_at));

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
              <Link
                href={`/admin/content-reset/trail/${trail.id}`}
                className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
              >
                <MapIcon className="h-3 w-3" />
                연결된 코스지도 초기화: {trail.name}
              </Link>
            ) : (
              <span className="text-gray-600">연결된 코스지도 없음</span>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
        퍼즐 완료 유저 ({rows.length}명) — 체크 후 진행 초기화
      </h2>
      <ResetUserList puzzleId={puzzle.id} rows={rows} />
    </main>
  );
}
