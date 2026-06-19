import Link from "next/link";
import { Coins, Plus } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import { categoryLabel } from "@/lib/basecamp-object-constants";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = "basecamp-assets";

type ObjectRow = {
  id: string;
  name: string;
  category: string;
  season: string | null;
  storage_path: string;
  sort_order: number | null;
  unlock_cost: number | null;
  design_key: string | null;
  created_at: string;
};

function publicImageUrl(storagePath: string, createdAt?: string): string {
  const base = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  return createdAt
    ? `${base}?v=${encodeURIComponent(createdAt)}`
    : base;
}

function buildHref(s: { category?: string }): string {
  const sp = new URLSearchParams();
  if (s.category && s.category !== "all") sp.set("category", s.category);
  const qs = sp.toString();
  return qs ? `/admin/objects?${qs}` : "/admin/objects";
}

export default async function ObjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const category = (sp.category ?? "all").trim();

  // 카테고리 옵션 동적 추출
  const { rows: allObjs } = await adminList<{ category: string }>(
    "basecamp_objects?select=category"
  );
  const categories = Array.from(new Set(allObjs.map((o) => o.category))).sort();

  const params = new URLSearchParams({
    select:
      "id,name,category,season,storage_path,sort_order,unlock_cost,design_key,created_at",
    order: "category.asc,sort_order.asc.nullslast,name.asc",
  });
  if (category !== "all") params.set("category", `eq.${category}`);

  const { rows, total } = await adminList<ObjectRow>(
    `basecamp_objects?${params.toString()}`,
    { from: 0, to: 499, count: true }
  );

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            오브젝트 카탈로그
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            총 {total.toLocaleString()}개
          </p>
        </div>
        <Link
          href="/admin/objects/new"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          새 오브젝트
        </Link>
      </header>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <Link
          href={buildHref({ category: "all" })}
          className={`px-3 h-8 inline-flex items-center rounded-lg text-xs font-medium transition-colors ${
            category === "all"
              ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
              : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
          }`}
        >
          전체
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={buildHref({ category: c })}
            className={`px-3 h-8 inline-flex items-center rounded-lg text-xs font-medium transition-colors ${
              category === c
                ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
                : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
            }`}
          >
            {categoryLabel(c)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          오브젝트가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {rows.map((o) => (
            <Link
              key={o.id}
              href={`/admin/objects/${o.id}`}
              className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-orange-500/40 hover:bg-white/[0.04] transition-colors group"
            >
              <div className="aspect-square bg-checkerboard">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicImageUrl(o.storage_path, o.created_at)}
                  alt={o.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <div
                  className="text-sm text-white truncate group-hover:text-orange-300 transition-colors"
                  title={o.name}
                >
                  {o.name}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                  <span className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                    {categoryLabel(o.category)}
                  </span>
                  <div className="flex items-center gap-2">
                    {o.unlock_cost != null && o.unlock_cost > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-orange-300 font-mono">
                        <Coins className="h-3 w-3" />
                        {o.unlock_cost}
                      </span>
                    ) : null}
                    {o.sort_order != null ? (
                      <span className="font-mono">#{o.sort_order}</span>
                    ) : null}
                  </div>
                </div>
                {o.design_key ? (
                  <code className="block mt-1 text-[10px] text-gray-600 truncate">
                    {o.design_key}
                  </code>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
