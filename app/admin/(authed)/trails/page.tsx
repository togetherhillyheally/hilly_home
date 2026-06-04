import Link from "next/link";
import { Search } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";
import TrailActiveToggle from "./TrailActiveToggle";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type MapFilter = "all" | "course" | "stamp";
type ActiveFilter = "all" | "active" | "inactive";

const MAP_LABELS: Record<MapFilter, string> = {
  all: "전체",
  course: "코스",
  stamp: "스탬프",
};
const ACTIVE_LABELS: Record<ActiveFilter, string> = {
  all: "전체",
  active: "활성",
  inactive: "비활성",
};

type Trail = {
  id: string;
  name: string;
  series_name: string | null;
  map_type: string | null;
  distance_km: number | null;
  total_ascent_m: number | null;
  activity_types: string[] | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
};

type ProfileMini = { id: string; nickname: string | null };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildHref(s: {
  q?: string;
  map?: MapFilter;
  active?: ActiveFilter;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (s.q) sp.set("q", s.q);
  if (s.map && s.map !== "all") sp.set("map", s.map);
  if (s.active && s.active !== "all") sp.set("active", s.active);
  if (s.page && s.page > 1) sp.set("page", String(s.page));
  const qs = sp.toString();
  return qs ? `/admin/trails?${qs}` : "/admin/trails";
}

export default async function TrailsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    map?: string;
    active?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const map = (
    ["course", "stamp"].includes(sp.map ?? "") ? sp.map : "all"
  ) as MapFilter;
  const active = (
    ["active", "inactive"].includes(sp.active ?? "") ? sp.active : "all"
  ) as ActiveFilter;
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select:
      "id,name,series_name,map_type,distance_km,total_ascent_m,activity_types,sort_order,is_active,created_at,created_by",
    order: "created_at.desc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set("or", `(name.ilike.*${t}*,series_name.ilike.*${t}*)`);
  }
  if (map !== "all") params.set("map_type", `eq.${map}`);
  if (active !== "all")
    params.set("is_active", active === "active" ? "eq.true" : "eq.false");

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows, total } = await adminList<Trail>(
    `trails?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const creatorIds = Array.from(
    new Set(rows.map((r) => r.created_by).filter(Boolean) as string[])
  );
  const creatorMap = new Map<string, string | null>();
  if (creatorIds.length > 0) {
    const { rows: cs } = await adminList<ProfileMini>(
      `profiles?select=id,nickname&id=in.(${creatorIds.join(",")})`
    );
    cs.forEach((p) => creatorMap.set(p.id, p.nickname));
  }

  const mapTabs: MapFilter[] = ["all", "course", "stamp"];
  const activeTabs: ActiveFilter[] = ["all", "active", "inactive"];

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          트레일 (코스 지도)
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          총 {total.toLocaleString()}개
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          action="/admin/trails"
          method="get"
          className="flex gap-2 flex-1 max-w-md min-w-[240px]"
        >
          <input type="hidden" name="map" value={map} />
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
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex flex-wrap gap-1.5">
          <span className="text-gray-500 self-center mr-1">맵</span>
          {mapTabs.map((t) => {
            const isActive = map === t;
            return (
              <Link
                key={t}
                href={buildHref({
                  q: q || undefined,
                  map: t,
                  active: active !== "all" ? active : undefined,
                })}
                className={`px-3 h-7 inline-flex items-center rounded-md font-medium transition-colors ${
                  isActive
                    ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
                    : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                }`}
              >
                {MAP_LABELS[t]}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-gray-500 self-center mr-1">상태</span>
          {activeTabs.map((t) => {
            const isActive = active === t;
            return (
              <Link
                key={t}
                href={buildHref({
                  q: q || undefined,
                  map: map !== "all" ? map : undefined,
                  active: t,
                })}
                className={`px-3 h-7 inline-flex items-center rounded-md font-medium transition-colors ${
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

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          결과가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">트레일</th>
                  <th className="text-left px-4 py-3 font-medium">타입</th>
                  <th className="text-right px-3 py-3 font-medium">거리</th>
                  <th className="text-right px-3 py-3 font-medium">고도</th>
                  <th className="text-left px-4 py-3 font-medium">활동</th>
                  <th className="text-left px-4 py-3 font-medium">생성자</th>
                  <th className="text-left px-4 py-3 font-medium">생성일</th>
                  <th className="text-center px-3 py-3 font-medium">활성</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="text-white truncate max-w-[260px]">
                        {t.name}
                      </div>
                      {t.series_name ? (
                        <div className="text-[11px] text-gray-500 truncate max-w-[260px]">
                          시리즈: {t.series_name}
                        </div>
                      ) : null}
                      <code className="text-[10px] text-gray-600">
                        {t.id.slice(0, 8)}…
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-gray-300 font-mono">
                        {t.map_type ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-gray-300 whitespace-nowrap">
                      {t.distance_km != null
                        ? `${Number(t.distance_km).toFixed(1)} km`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-gray-300 whitespace-nowrap">
                      {t.total_ascent_m != null ? `${t.total_ascent_m} m` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {t.activity_types && t.activity_types.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.activity_types.map((a) => (
                            <span
                              key={a}
                              className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-gray-300 text-[10px]"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {t.created_by ? (
                        <>
                          {creatorMap.get(t.created_by) ?? (
                            <span className="text-gray-600">(없음)</span>
                          )}
                          <code className="block text-[10px] text-gray-600">
                            {t.created_by.slice(0, 8)}…
                          </code>
                        </>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <TrailActiveToggle
                        trailId={t.id}
                        initial={t.is_active}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        basePath="/admin/trails"
        page={page}
        totalPages={totalPages}
        query={{
          q: q || undefined,
          map: map !== "all" ? map : undefined,
          active: active !== "all" ? active : undefined,
        }}
      />
    </main>
  );
}
