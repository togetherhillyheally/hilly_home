import Link from "next/link";
import { ChevronRight, Search, Sprout } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Profile = {
  id: string;
  nickname: string | null;
  phone_number: string | null;
  created_at: string;
};

type Plant = {
  user_id: string;
  species_id: string;
  is_mature: boolean;
  placed: boolean;
  planted_at: string;
};

type SeedBalance = { user_id: string; balance: number };

export default async function UserGardensPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select: "id,nickname,phone_number,created_at",
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

  type Agg = {
    total: number;
    placed: number;
    mature: number;
    brand: number;
    speciesSet: Set<string>;
    latest: string | null;
  };
  const plantAgg = new Map<string, Agg>();
  const seedMap = new Map<string, number>();

  if (profiles.length > 0) {
    const inList = profiles.map((p) => p.id).join(",");
    const [{ rows: plants }, { rows: seeds }] = await Promise.all([
      adminList<Plant>(
        `garden_plants?select=user_id,species_id,is_mature,placed,planted_at&user_id=in.(${inList})`,
        { from: 0, to: 9999 }
      ),
      adminList<SeedBalance>(
        `garden_seed_balance?select=user_id,balance&user_id=in.(${inList})`
      ),
    ]);

    plants.forEach((p) => {
      const cur = plantAgg.get(p.user_id) ?? {
        total: 0,
        placed: 0,
        mature: 0,
        brand: 0,
        speciesSet: new Set<string>(),
        latest: null,
      };
      cur.total += 1;
      if (p.placed) cur.placed += 1;
      if (p.is_mature) cur.mature += 1;
      cur.speciesSet.add(p.species_id);
      if (!cur.latest || p.planted_at > cur.latest) cur.latest = p.planted_at;
      plantAgg.set(p.user_id, cur);
    });

    seeds.forEach((s) => seedMap.set(s.user_id, s.balance));
  }

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          사용자 정원
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          유저별 정원 요약 · 총 {total.toLocaleString()}명
        </p>
      </header>

      <form
        action="/admin/user-camps"
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
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">유저</th>
                  <th className="text-right px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Sprout className="h-3 w-3 text-emerald-300" />
                      정원 씨앗
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 font-medium">보유</th>
                  <th className="text-center px-4 py-3 font-medium">배치</th>
                  <th className="text-center px-4 py-3 font-medium">성숙</th>
                  <th className="text-center px-4 py-3 font-medium">종류</th>
                  <th className="text-left px-4 py-3 font-medium">마지막 심음</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const agg = plantAgg.get(p.id);
                  const seeds = seedMap.get(p.id) ?? 0;
                  const speciesCount = agg?.speciesSet.size ?? 0;
                  return (
                    <tr key={p.id} className="border-t border-white/5 group">
                      <td className="p-0">
                        <Link
                          href={`/admin/users/${p.id}`}
                          className="block px-4 py-3 group-hover:bg-white/[0.03]"
                        >
                          <div className="text-white">
                            {p.nickname ?? (
                              <span className="text-gray-600">(없음)</span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500">
                            {p.phone_number ?? ""}
                          </div>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={`/admin/users/${p.id}`}
                          className="block px-4 py-3 text-right group-hover:bg-white/[0.03]"
                        >
                          <span
                            className={`font-mono text-sm ${seeds > 0 ? "text-emerald-200" : "text-gray-600"}`}
                          >
                            {seeds.toLocaleString()}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={`/admin/users/${p.id}`}
                          className="block px-4 py-3 text-center group-hover:bg-white/[0.03] text-xs text-gray-300"
                        >
                          {agg?.total ?? 0}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={`/admin/users/${p.id}`}
                          className="block px-4 py-3 text-center group-hover:bg-white/[0.03] text-xs"
                        >
                          <span
                            className={
                              (agg?.placed ?? 0) > 0
                                ? "text-emerald-200"
                                : "text-gray-600"
                            }
                          >
                            {agg?.placed ?? 0}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={`/admin/users/${p.id}`}
                          className="block px-4 py-3 text-center group-hover:bg-white/[0.03] text-xs"
                        >
                          <span
                            className={
                              (agg?.mature ?? 0) > 0
                                ? "text-yellow-200"
                                : "text-gray-600"
                            }
                          >
                            {agg?.mature ?? 0}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={`/admin/users/${p.id}`}
                          className="block px-4 py-3 text-center group-hover:bg-white/[0.03] text-xs text-gray-300"
                        >
                          {speciesCount}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={`/admin/users/${p.id}`}
                          className="block px-4 py-3 text-xs text-gray-400 whitespace-nowrap group-hover:bg-white/[0.03]"
                        >
                          {agg?.latest
                            ? new Date(agg.latest).toLocaleString("ko-KR", {
                                year: "2-digit",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </Link>
                      </td>
                      <td className="p-0 w-8">
                        <Link
                          href={`/admin/users/${p.id}`}
                          className="flex items-center justify-center h-full px-2 py-3 text-gray-500 group-hover:text-emerald-300 group-hover:bg-white/[0.03]"
                          aria-label="정원 상세"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
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
        basePath="/admin/user-camps"
        page={page}
        totalPages={totalPages}
        query={{ q: q || undefined }}
      />
    </main>
  );
}
