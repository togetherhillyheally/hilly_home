import Link from "next/link";
import { ChevronRight, Map as MapIcon, Puzzle, Search } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Tab = "puzzle" | "trail";
type ActiveFilter = "all" | "active" | "inactive";

const ACTIVE_LABELS: Record<ActiveFilter, string> = {
  all: "전체",
  active: "활성",
  inactive: "비활성",
};

type PuzzleRow = {
  id: string;
  name: string;
  series_name: string | null;
  trail_id: string | null;
  total_pieces: number;
  is_active: boolean;
  created_at: string;
};

type TrailRow = {
  id: string;
  name: string;
  series_name: string | null;
  is_active: boolean;
  created_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildHref(s: {
  tab: Tab;
  q?: string;
  active?: ActiveFilter;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  sp.set("tab", s.tab);
  if (s.q) sp.set("q", s.q);
  if (s.active && s.active !== "all") sp.set("active", s.active);
  if (s.page && s.page > 1) sp.set("page", String(s.page));
  return `/admin/content-reset?${sp.toString()}`;
}

export default async function ContentResetPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    active?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "trail" ? "trail" : "puzzle";
  const q = (sp.q ?? "").trim();
  const active = (
    ["active", "inactive"].includes(sp.active ?? "") ? sp.active : "all"
  ) as ActiveFilter;
  const page = Math.max(1, Number(sp.page) || 1);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const activeTabs: ActiveFilter[] = ["all", "active", "inactive"];

  const header = (
    <header className="mb-6">
      <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
        컨텐츠 초기화
      </h1>
      <p className="text-sm text-gray-400 mt-1">
        퍼즐(또는 연결된 코스지도)을 선택해 유저별 진행 상태를 초기화할 수
        있어요.
      </p>
    </header>
  );

  const tabNav = (
    <div className="mb-4 flex flex-wrap gap-1.5">
      <Link
        href={buildHref({ tab: "puzzle" })}
        className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
          tab === "puzzle"
            ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
            : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
        }`}
      >
        <Puzzle className="h-4 w-4" />
        퍼즐 리스트
      </Link>
      <Link
        href={buildHref({ tab: "trail" })}
        className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
          tab === "trail"
            ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
            : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
        }`}
      >
        <MapIcon className="h-4 w-4" />
        코스지도 리스트 (퍼즐지도)
      </Link>
    </div>
  );

  const filterBar = (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <form
        action="/admin/content-reset"
        method="get"
        className="flex gap-2 flex-1 max-w-md min-w-[240px]"
      >
        <input type="hidden" name="tab" value={tab} />
        <input type="hidden" name="active" value={active} />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            name="q"
            type="text"
            placeholder="이름 / 시리즈명"
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

      <div className="flex flex-wrap gap-1.5">
        <span className="text-gray-500 self-center mr-1 text-xs">상태</span>
        {activeTabs.map((t) => {
          const isActive = active === t;
          return (
            <Link
              key={t}
              href={buildHref({ tab, q: q || undefined, active: t })}
              className={`px-3 h-7 inline-flex items-center rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
                  : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
              }`}
            >
              {ACTIVE_LABELS[t]}
            </Link>
          );
        })}
      </div>
    </div>
  );

  if (tab === "trail") {
    // 퍼즐지도 = 퍼즐이 연결된 코스지도(trail)
    const { rows: puzzleRows } = await adminList<{
      id: string;
      trail_id: string;
    }>("puzzles?select=id,trail_id&trail_id=not.is.null", {
      from: 0,
      to: 4999,
    });
    const puzzleIdByTrail = new Map(
      puzzleRows.map((p) => [p.trail_id, p.id])
    );
    const puzzleMapTrailIds = Array.from(puzzleIdByTrail.keys());

    let rows: TrailRow[] = [];
    let total = 0;
    if (puzzleMapTrailIds.length > 0) {
      const params = new URLSearchParams({
        select: "id,name,series_name,is_active,created_at",
        order: "created_at.desc",
        map_type: "eq.adventure",
        id: `in.(${puzzleMapTrailIds.join(",")})`,
      });
      if (q) {
        const t = escapeIlike(q);
        params.set("or", `(name.ilike.*${t}*,series_name.ilike.*${t}*)`);
      }
      if (active !== "all") {
        params.set("is_active", active === "active" ? "eq.true" : "eq.false");
      }
      const res = await adminList<TrailRow>(`trails?${params.toString()}`, {
        from,
        to,
        count: true,
      });
      rows = res.rows;
      total = res.total;
    }
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
      <main className="p-6 lg:p-10">
        {header}
        {tabNav}
        {filterBar}

        {rows.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
            결과가 없습니다.
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-white/[0.03] text-gray-400 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">코스지도</th>
                    <th className="text-left px-4 py-3 font-medium">시리즈</th>
                    <th className="text-left px-4 py-3 font-medium">생성일</th>
                    <th className="text-center px-3 py-3 font-medium">활성</th>
                    <th className="text-right px-3 py-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const puzzleId = puzzleIdByTrail.get(t.id);
                    return (
                      <tr
                        key={t.id}
                        className="border-t border-white/5 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/content-reset/trail/${t.id}`}
                            className="text-white hover:text-orange-300 transition-colors"
                          >
                            {t.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-300">
                          {t.series_name ?? (
                            <span className="text-gray-600">—</span>
                          )}
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
                        <td className="px-3 py-3 text-right">
                          {puzzleId ? (
                            <Link
                              href={`/admin/content-reset/puzzle/${puzzleId}`}
                              title="연결된 퍼즐 초기화"
                              className="inline-flex text-gray-600 hover:text-violet-300 transition-colors"
                            >
                              <Puzzle className="h-4 w-4" />
                            </Link>
                          ) : null}
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
          basePath="/admin/content-reset"
          page={page}
          totalPages={totalPages}
          query={{
            tab,
            q: q || undefined,
            active: active !== "all" ? active : undefined,
          }}
        />
      </main>
    );
  }

  // tab === "puzzle"
  const params = new URLSearchParams({
    select: "id,name,series_name,trail_id,total_pieces,is_active,created_at",
    order: "created_at.desc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set("or", `(name.ilike.*${t}*,series_name.ilike.*${t}*)`);
  }
  if (active !== "all") {
    params.set("is_active", active === "active" ? "eq.true" : "eq.false");
  }
  const { rows, total } = await adminList<PuzzleRow>(
    `puzzles?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const trailIds = Array.from(
    new Set(rows.map((r) => r.trail_id).filter(Boolean) as string[])
  );
  const trailNameMap = new Map<string, string>();
  if (trailIds.length > 0) {
    const { rows: trailRows } = await adminList<{ id: string; name: string }>(
      `trails?select=id,name&id=in.(${trailIds.join(",")})`
    );
    trailRows.forEach((t) => trailNameMap.set(t.id, t.name));
  }

  return (
    <main className="p-6 lg:p-10">
      {header}
      {tabNav}
      {filterBar}

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
                  <th className="text-left px-4 py-3 font-medium">퍼즐</th>
                  <th className="text-left px-4 py-3 font-medium">시리즈</th>
                  <th className="text-left px-4 py-3 font-medium">연결된 코스지도</th>
                  <th className="text-right px-3 py-3 font-medium">조각 수</th>
                  <th className="text-left px-4 py-3 font-medium">생성일</th>
                  <th className="text-center px-3 py-3 font-medium">활성</th>
                  <th className="text-right px-3 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/content-reset/puzzle/${p.id}`}
                        className="text-white hover:text-orange-300 transition-colors"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {p.series_name ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {p.trail_id ? (
                        trailNameMap.get(p.trail_id) ?? (
                          <span className="text-gray-600">
                            {p.trail_id.slice(0, 8)}…
                          </span>
                        )
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-gray-300">
                      {p.total_pieces}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {p.is_active ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium">
                          활성
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-gray-500 text-[10px] font-medium">
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/admin/content-reset/puzzle/${p.id}`}
                        className="inline-flex text-gray-600 hover:text-white transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        basePath="/admin/content-reset"
        page={page}
        totalPages={totalPages}
        query={{
          tab,
          q: q || undefined,
          active: active !== "all" ? active : undefined,
        }}
      />
    </main>
  );
}
