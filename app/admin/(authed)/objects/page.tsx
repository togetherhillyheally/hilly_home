import Link from "next/link";
import { Coins } from "lucide-react";
import { adminList } from "@/lib/admin-rest";

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
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          오브젝트 카탈로그
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          총 {total.toLocaleString()}개
        </p>
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
            {c}
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
            <div
              key={o.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
            >
              <div className="aspect-square bg-white/[0.04] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicImageUrl(o.storage_path, o.created_at)}
                  alt={o.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
                {o.unlock_cost != null && o.unlock_cost > 0 ? (
                  <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/60 text-orange-300 text-[10px] font-mono">
                    <Coins className="h-2.5 w-2.5" />
                    {o.unlock_cost}
                  </span>
                ) : null}
              </div>
              <div className="p-3">
                <div className="text-sm text-white truncate" title={o.name}>
                  {o.name}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                  <span className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                    {o.category}
                  </span>
                  {o.sort_order != null ? (
                    <span className="font-mono">#{o.sort_order}</span>
                  ) : null}
                </div>
                {o.design_key ? (
                  <code className="block mt-1 text-[10px] text-gray-600 truncate">
                    {o.design_key}
                  </code>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
