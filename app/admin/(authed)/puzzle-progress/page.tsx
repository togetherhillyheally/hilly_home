import { redirect } from "next/navigation";
import { CheckCircle2, Circle, Trophy } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import { hasMenuAccess, readAdminSession, scopeFor } from "@/lib/admin-session";
import { firstAccessibleHref } from "@/lib/admin-nav";
import Pagination from "../Pagination";
import PuzzlePicker from "./PuzzlePicker";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type PuzzleOption = { id: string; name: string };
type Participant = { user_id: string; joined_at: string };
type Completion = { user_id: string; cycle: number; completed_at: string };
type ProfileMini = { id: string; nickname: string | null; phone_number: string | null };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmptyShell({ message }: { message: string }) {
  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          퍼즐 진행 내역
        </h1>
      </header>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
        {message}
      </div>
    </main>
  );
}

export default async function PuzzleProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ puzzle_id?: string; page?: string }>;
}) {
  const session = await readAdminSession();
  if (!session) redirect("/admin");
  if (!hasMenuAccess(session, "puzzle-progress")) {
    redirect(firstAccessibleHref(session.menuKeys) ?? "/admin");
  }

  // null = 전체 조회, 배열 = 그 퍼즐 id들로만 제한(빈 배열 = 조회 가능한 퍼즐 없음)
  const scope = scopeFor(session, "puzzle-progress");
  if (scope !== null && scope.length === 0) {
    return (
      <EmptyShell message="조회 권한이 부여된 퍼즐이 없어요. 관리자에게 문의해주세요." />
    );
  }

  let puzzleQuery = "puzzles?select=id,name&order=created_at.desc";
  if (scope !== null) puzzleQuery += `&id=in.(${scope.join(",")})`;
  const { rows: puzzleOptions } = await adminList<PuzzleOption>(puzzleQuery);
  if (puzzleOptions.length === 0) {
    return <EmptyShell message="등록된 퍼즐이 없어요." />;
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  // 스코프 밖 puzzle_id 를 쿼리로 넘겨도 puzzleOptions 에 없으면 무시되고 첫 번째 허용 퍼즐로 대체됨
  const selected =
    puzzleOptions.find((p) => p.id === sp.puzzle_id) ?? puzzleOptions[0];

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows: participants, total } = await adminList<Participant>(
    `puzzle_participants?select=user_id,joined_at&puzzle_id=eq.${selected.id}&order=joined_at.desc`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const userIds = participants.map((p) => p.user_id);
  const completionMap = new Map<string, { count: number; latest: string }>();
  const profileMap = new Map<string, ProfileMini>();

  if (userIds.length > 0) {
    const inList = userIds.join(",");
    const [{ rows: completions }, { rows: profiles }] = await Promise.all([
      adminList<Completion>(
        `puzzle_completions?select=user_id,cycle,completed_at&puzzle_id=eq.${selected.id}&user_id=in.(${inList})&order=completed_at.desc`
      ),
      adminList<ProfileMini>(
        `profiles?select=id,nickname,phone_number&id=in.(${inList})`
      ),
    ]);
    completions.forEach((c) => {
      const cur = completionMap.get(c.user_id);
      if (!cur) {
        completionMap.set(c.user_id, { count: 1, latest: c.completed_at });
      } else {
        cur.count += 1;
      }
    });
    profiles.forEach((p) => profileMap.set(p.id, p));
  }

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          퍼즐 진행 내역
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          퍼즐별 참가자 완성 현황 · 총 {total.toLocaleString()}명
        </p>
      </header>

      <div className="mb-4">
        <PuzzlePicker options={puzzleOptions} selectedId={selected.id} />
      </div>

      {participants.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          아직 참가자가 없어요.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">유저</th>
                  <th className="text-left px-4 py-3 font-medium">연락처</th>
                  <th className="text-left px-4 py-3 font-medium">참가일</th>
                  <th className="text-center px-4 py-3 font-medium">완료 여부</th>
                  <th className="text-center px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-violet-300" />
                      완료 횟수
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">최근 완료일</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const prof = profileMap.get(p.user_id);
                  const comp = completionMap.get(p.user_id);
                  return (
                    <tr
                      key={p.user_id}
                      className="border-t border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-white">
                        {prof?.nickname ?? (
                          <span className="text-gray-600">(없음)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-300 text-xs">
                        {prof?.phone_number ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(p.joined_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {comp ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 inline-block" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-600 inline-block" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-300">
                        {comp?.count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(comp?.latest ?? null)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        basePath="/admin/puzzle-progress"
        page={page}
        totalPages={totalPages}
        query={{ puzzle_id: selected.id }}
      />
    </main>
  );
}
