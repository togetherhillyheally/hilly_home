import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import SeriesList from "./SeriesList";

export const dynamic = "force-dynamic";

type Row = { series_name: string | null };

export default async function TrailSeriesPage() {
  const { rows } = await adminList<Row>(
    `trails?select=series_name&series_name=not.is.null`,
    { from: 0, to: 9999 }
  );

  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = r.series_name?.trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const series = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <Link
          href="/admin/trails"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          코스 지도
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          시리즈 관리
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          시리즈명을 변경하면 해당 시리즈에 속한 모든 지도에 일괄 반영됩니다.
        </p>
      </header>

      {series.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          등록된 시리즈가 없습니다.
        </div>
      ) : (
        <SeriesList items={series} />
      )}
    </main>
  );
}
