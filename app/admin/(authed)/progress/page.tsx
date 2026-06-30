import { Coins, Search, Sprout, Trophy } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Profile = {
  id: string;
  nickname: string | null;
  phone_number: string | null;
  email: string | null;
  created_at: string;
};

type CampfireBalance = {
  user_id: string;
  balance: number;
};

type SeedBalance = {
  user_id: string;
  trail_id: string | null;
  pieces: number;
};

type TierRow = { user_id: string; puzzle_id: string };

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select: "id,nickname,phone_number,email,created_at",
    order: "created_at.desc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set(
      "or",
      `(nickname.ilike.*${t}*,phone_number.ilike.*${t}*,email.ilike.*${t}*)`
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows: profiles, total } = await adminList<Profile>(
    `profiles?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const userIds = profiles.map((p) => p.id);

  // 정원 씨앗(campfire) 잔액 / 씨앗 합계 / 활성 퍼즐 일괄 조회
  const campfireMap = new Map<string, number>();
  const seedSumMap = new Map<string, number>();
  const seedBrandTrailCountMap = new Map<string, number>();
  const tierCountMap = new Map<string, number>();

  if (userIds.length > 0) {
    const inList = userIds.join(",");

    const [{ rows: cf }, { rows: sd }, { rows: tiers }] = await Promise.all([
      adminList<CampfireBalance>(
        `puzzle_campfire_balance?select=user_id,balance&user_id=in.(${inList})`
      ),
      adminList<SeedBalance>(
        `garden_trail_seed_balance?select=user_id,trail_id,pieces&user_id=in.(${inList})`
      ),
      adminList<TierRow>(
        `user_puzzle_tiers?select=user_id,puzzle_id&user_id=in.(${inList})`
      ),
    ]);

    cf.forEach((c) => campfireMap.set(c.user_id, c.balance));
    sd.forEach((f) => {
      seedSumMap.set(f.user_id, (seedSumMap.get(f.user_id) ?? 0) + f.pieces);
      if (f.trail_id) {
        seedBrandTrailCountMap.set(
          f.user_id,
          (seedBrandTrailCountMap.get(f.user_id) ?? 0) + 1
        );
      }
    });
    tiers.forEach((t) =>
      tierCountMap.set(t.user_id, (tierCountMap.get(t.user_id) ?? 0) + 1)
    );
  }

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          사용자 진행 상태
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          유저별 씨앗 / 정원 씨앗 / 퍼즐 진행 요약 · 총 {total.toLocaleString()}명
        </p>
      </header>

      <form
        action="/admin/progress"
        method="get"
        className="mb-4 flex gap-2 max-w-md"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            name="q"
            type="text"
            placeholder="닉네임 / 휴대폰 / 이메일"
            defaultValue={q}
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
          />
        </div>
        <button
          type="submit"
          className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm"
        >
          검색
        </button>
      </form>

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          결과가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">유저</th>
                  <th className="text-left px-4 py-3 font-medium">연락처</th>
                  <th className="text-right px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Sprout className="h-3 w-3 text-emerald-300" />
                      씨앗 합계
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3 w-3 text-orange-300" />
                      정원 씨앗
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 font-medium">브랜드 트레일</th>
                  <th className="text-center px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-violet-300" />
                      활성 퍼즐
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const cf = campfireMap.get(p.id) ?? 0;
                  const sd = seedSumMap.get(p.id) ?? 0;
                  const brandTrailCount =
                    seedBrandTrailCountMap.get(p.id) ?? 0;
                  const tierCount = tierCountMap.get(p.id) ?? 0;
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="text-white">
                          {p.nickname ?? (
                            <span className="text-gray-600">(없음)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono text-gray-300">
                          {p.phone_number ?? "—"}
                        </div>
                        <div className="text-gray-500 truncate max-w-[160px]">
                          {p.email ?? ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono text-sm ${sd > 0 ? "text-emerald-200" : "text-gray-600"}`}
                        >
                          {sd.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono text-sm ${cf > 0 ? "text-orange-200" : "text-gray-600"}`}
                        >
                          {cf.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-300">
                        {brandTrailCount}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-300">
                        {tierCount}
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
        basePath="/admin/progress"
        page={page}
        totalPages={totalPages}
        query={{ q: q || undefined }}
      />
    </main>
  );
}
