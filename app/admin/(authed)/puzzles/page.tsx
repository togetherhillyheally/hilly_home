import Link from "next/link";
import { adminList } from "@/lib/admin-rest";
import PuzzleCard, { type PuzzleRow } from "./PuzzleCard";

export const dynamic = "force-dynamic";

type ActiveFilter = "all" | "active" | "inactive";
const LABELS: Record<ActiveFilter, string> = {
  all: "전체",
  active: "활성",
  inactive: "비활성",
};

function buildHref(s: { filter?: ActiveFilter }): string {
  const sp = new URLSearchParams();
  if (s.filter && s.filter !== "all") sp.set("filter", s.filter);
  const qs = sp.toString();
  return qs ? `/admin/puzzles?${qs}` : "/admin/puzzles";
}

export default async function PuzzlesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter = (
    ["active", "inactive"].includes(sp.filter ?? "") ? sp.filter : "all"
  ) as ActiveFilter;

  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
  });
  if (filter === "active") params.set("is_active", "eq.true");
  else if (filter === "inactive") params.set("is_active", "eq.false");

  const { rows, total } = await adminList<PuzzleRow>(
    `puzzles?${params.toString()}`,
    { from: 0, to: 199, count: true }
  );

  const tabs: ActiveFilter[] = ["all", "active", "inactive"];

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          퍼즐 정의
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {LABELS[filter]} · 총 {total.toLocaleString()}개
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const active = filter === t;
          return (
            <Link
              key={t}
              href={buildHref({ filter: t })}
              className={`px-3 h-8 inline-flex items-center rounded-lg text-xs font-medium transition-colors ${
                active
                  ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
                  : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
              }`}
            >
              {LABELS[t]}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          퍼즐이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rows.map((p) => (
            <PuzzleCard key={p.id} puzzle={p} />
          ))}
        </div>
      )}
    </main>
  );
}
