import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";
import SimpleActiveToggle from "../SimpleActiveToggle";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Track = {
  id: string;
  title: string;
  artist: string | null;
  mood: string | null;
  file_path: string;
  duration_sec: number | null;
  source_url: string | null;
  sort_order: number | null;
  is_active: boolean;
};

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default async function BgmPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select:
      "id,title,artist,mood,file_path,duration_sec,source_url,sort_order,is_active",
    order: "sort_order.asc.nullslast,title.asc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set(
      "or",
      `(title.ilike.*${t}*,artist.ilike.*${t}*,mood.ilike.*${t}*)`
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { rows, total } = await adminList<Track>(
    `bgm_tracks?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          BGM 트랙
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          총 {total.toLocaleString()}곡
        </p>
      </header>

      <form
        action="/admin/bgm"
        method="get"
        className="mb-4 flex gap-2 max-w-md"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            name="q"
            type="text"
            placeholder="제목 / 아티스트 / 무드"
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

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          결과가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-center px-3 py-3 font-medium w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium">트랙</th>
                  <th className="text-left px-4 py-3 font-medium">무드</th>
                  <th className="text-right px-3 py-3 font-medium">길이</th>
                  <th className="text-left px-4 py-3 font-medium">파일</th>
                  <th className="text-left px-3 py-3 font-medium">출처</th>
                  <th className="text-center px-3 py-3 font-medium">활성</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3 text-center text-xs text-gray-500 font-mono">
                      {t.sort_order ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white truncate max-w-[260px]">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate max-w-[260px]">
                        {t.artist ?? "(아티스트 없음)"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {t.mood ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-gray-300">
                          {t.mood}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-mono text-gray-300 whitespace-nowrap">
                      {formatDuration(t.duration_sec)}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-[11px] text-gray-400 truncate inline-block max-w-[200px] align-bottom">
                        {t.file_path}
                      </code>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {t.source_url ? (
                        <a
                          href={t.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-orange-300 hover:text-orange-200"
                        >
                          <ExternalLink className="h-3 w-3" />
                          link
                        </a>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <SimpleActiveToggle
                        endpoint={`/api/admin/bgm/${t.id}`}
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
        basePath="/admin/bgm"
        page={page}
        totalPages={totalPages}
        query={{ q: q || undefined }}
      />
    </main>
  );
}
