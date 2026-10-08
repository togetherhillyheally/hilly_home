import Link from "next/link";
import { Gem, Plus, Search } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";
import type { TreasureReward } from "@/lib/trail-treasure";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type ActiveFilter = "all" | "active" | "inactive";

const ACTIVE_LABELS: Record<ActiveFilter, string> = {
  all: "전체",
  active: "활성",
  inactive: "비활성",
};

type TreasureTrail = {
  id: string;
  name: string;
  series_name: string | null;
  is_active: boolean;
  sort_order: number | null;
  treasure_count: number | null;
  treasure_reward_pool: TreasureReward[] | null;
  created_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildHref(s: {
  q?: string;
  active?: ActiveFilter;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (s.q) sp.set("q", s.q);
  if (s.active && s.active !== "all") sp.set("active", s.active);
  if (s.page && s.page > 1) sp.set("page", String(s.page));
  const qs = sp.toString();
  return qs ? `/admin/treasures?${qs}` : "/admin/treasures";
}

export default async function TreasuresPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    active?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const active = (
    ["active", "inactive"].includes(sp.active ?? "") ? sp.active : "all"
  ) as ActiveFilter;
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select:
      "id,name,series_name,is_active,sort_order,treasure_count,treasure_reward_pool,created_at",
    order: "sort_order.asc,created_at.desc",
  });
  params.set("map_type", "eq.treasure");
  if (q) {
    const t = escapeIlike(q);
    params.set("or", `(name.ilike.*${t}*,series_name.ilike.*${t}*)`);
  }
  if (active !== "all") {
    params.set("is_active", active === "active" ? "eq.true" : "eq.false");
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows, total } = await adminList<TreasureTrail>(
    `trails?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeTabs: ActiveFilter[] = ["all", "active", "inactive"];

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight inline-flex items-center gap-2">
            <Gem className="h-6 w-6" style={{ color: "#F2B705" }} />
            보물 지도
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            총 {total.toLocaleString()}개 · 세션마다 보물을 숨겨 씨앗 보상을 지급해요
          </p>
        </div>
        <Link
          href="/admin/trails/upload?map_type=treasure"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ backgroundColor: "#F2B705" }}
        >
          <Plus className="h-4 w-4" />
          새 보물 지도
        </Link>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          action="/admin/treasures"
          method="get"
          className="flex gap-2 flex-1 max-w-md min-w-[240px]"
        >
          <input type="hidden" name="active" value={active} />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              name="q"
              type="text"
              placeholder="이름 / 시리즈명"
              defaultValue={q}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm"
          >
            검색
          </button>
        </form>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex flex-wrap gap-1.5">
          <span className="text-gray-500 self-center mr-1">상태</span>
          {activeTabs.map((t) => {
            const isActive = active === t;
            return (
              <Link
                key={t}
                href={buildHref({ q: q || undefined, active: t })}
                className={`px-3 h-7 inline-flex items-center rounded-md font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
                    : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                }`}
              >
                {ACTIVE_LABELS[t]}
              </Link>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          결과가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">종류</th>
                  <th className="text-left px-4 py-3 font-medium">보물 지도</th>
                  <th className="text-left px-4 py-3 font-medium">시리즈</th>
                  <th className="text-right px-4 py-3 font-medium">보물 수</th>
                  <th className="text-right px-4 py-3 font-medium">보상 풀</th>
                  <th className="text-left px-4 py-3 font-medium">생성일</th>
                  <th className="text-center px-3 py-3 font-medium">활성</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const poolCount = Array.isArray(t.treasure_reward_pool)
                    ? t.treasure_reward_pool.length
                    : 0;
                  return (
                    <tr
                      key={t.id}
                      className="border-t border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold"
                          style={{
                            backgroundColor: "rgba(242,183,5,0.12)",
                            borderColor: "rgba(242,183,5,0.45)",
                            color: "#F2B705",
                          }}
                        >
                          <Gem className="h-3 w-3" />
                          보물
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/trails/${t.id}`}
                          className="text-white truncate max-w-[280px] block hover:text-amber-300 transition-colors"
                        >
                          {t.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300">
                        {t.series_name ? (
                          <span className="truncate inline-block max-w-[180px] align-middle">
                            {t.series_name}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium">
                          {t.treasure_count ?? 10}개
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-xs text-gray-300">
                        {poolCount}종
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {t.is_active ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium">
                            활성
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-gray-500 text-[10px] font-medium">
                            비활성
                          </span>
                        )}
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
        basePath="/admin/treasures"
        page={page}
        totalPages={totalPages}
        query={{
          q: q || undefined,
          active: active !== "all" ? active : undefined,
        }}
      />
    </main>
  );
}
