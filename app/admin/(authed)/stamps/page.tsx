import Link from "next/link";
import { Search } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type StampPoint = {
  id: string;
  trail_id: string;
  title: string;
  hint: string | null;
  lng: number;
  lat: number;
  sort_order: number;
  created_at: string;
};

type TrailMini = { id: string; name: string };

function parseStampTitle(raw: string): { icon: string | null; label: string } {
  const idx = raw.indexOf("|");
  if (idx === -1) return { icon: null, label: raw };
  return {
    icon: raw.slice(0, idx).trim() || null,
    label: raw.slice(idx + 1).trim() || raw,
  };
}

function buildHref(s: { q?: string; trail?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (s.q) sp.set("q", s.q);
  if (s.trail) sp.set("trail", s.trail);
  if (s.page && s.page > 1) sp.set("page", String(s.page));
  const qs = sp.toString();
  return qs ? `/admin/stamps?${qs}` : "/admin/stamps";
}

export default async function StampsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trail?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const trailFilter = (sp.trail ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select: "id,trail_id,title,hint,lng,lat,sort_order,created_at",
    order: "trail_id.asc,sort_order.asc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set("or", `(title.ilike.*${t}*,hint.ilike.*${t}*)`);
  }
  if (trailFilter) params.set("trail_id", `eq.${trailFilter}`);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows, total } = await adminList<StampPoint>(
    `stamp_points?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const trailIds = Array.from(new Set(rows.map((r) => r.trail_id)));
  const trailMap = new Map<string, string>();
  if (trailIds.length > 0) {
    const { rows: trails } = await adminList<TrailMini>(
      `trails?select=id,name&id=in.(${trailIds.join(",")})`
    );
    trails.forEach((t) => trailMap.set(t.id, t.name));
  }

  // 트레일 필터 드롭다운용: 스탬프 맵 트레일 전체
  const { rows: stampTrails } = await adminList<TrailMini>(
    "trails?select=id,name&map_type=eq.stamp&order=name.asc"
  );

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          스탬프 지도
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          총 {total.toLocaleString()}개 포인트
        </p>
      </header>

      <form
        action="/admin/stamps"
        method="get"
        className="mb-4 flex flex-wrap gap-2"
      >
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            name="q"
            type="text"
            placeholder="제목 / 힌트"
            defaultValue={q}
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
          />
        </div>
        <select
          name="trail"
          defaultValue={trailFilter}
          className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
        >
          <option value="">모든 트레일</option>
          {stampTrails.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm"
        >
          적용
        </button>
        {(q || trailFilter) && (
          <Link
            href="/admin/stamps"
            className="px-3 h-10 inline-flex items-center rounded-lg bg-white/[0.02] border border-white/10 text-gray-400 text-xs hover:text-white"
          >
            초기화
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          결과가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-center px-3 py-3 font-medium w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium">트레일</th>
                  <th className="text-left px-4 py-3 font-medium">제목</th>
                  <th className="text-left px-4 py-3 font-medium">힌트</th>
                  <th className="text-right px-4 py-3 font-medium">좌표</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3 text-center text-xs text-gray-500 font-mono">
                      {p.sort_order}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-gray-200 truncate max-w-[200px]">
                        {trailMap.get(p.trail_id) ?? (
                          <span className="text-gray-600">(없음)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const { icon, label } = parseStampTitle(p.title);
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-white">{label}</span>
                            {icon ? (
                              <code className="text-[10px] text-gray-500 bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5">
                                {icon}
                              </code>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 max-w-[280px]">
                      {p.hint ? (
                        <span className="line-clamp-2">{p.hint}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] font-mono text-gray-400 whitespace-nowrap">
                      <a
                        href={`https://map.kakao.com/link/map/${encodeURIComponent(p.title)},${p.lat},${p.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-orange-300"
                        title="카카오맵에서 보기"
                      >
                        {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        basePath="/admin/stamps"
        page={page}
        totalPages={totalPages}
        query={{ q: q || undefined, trail: trailFilter || undefined }}
      />
    </main>
  );
}
