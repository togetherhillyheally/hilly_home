import { adminList } from "@/lib/admin-rest";
import SimpleActiveToggle from "../SimpleActiveToggle";

export const dynamic = "force-dynamic";

type Background = {
  id: string;
  url: string;
  is_active: boolean;
  sort_order: number | null;
  created_at: string;
};

export default async function BackgroundsPage() {
  const { rows, total } = await adminList<Background>(
    "profile_backgrounds?select=*&order=sort_order.asc.nullslast,created_at.desc",
    { from: 0, to: 199, count: true }
  );

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          프로필 배경
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          총 {total.toLocaleString()}개
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          등록된 배경이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {rows.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
            >
              <div className="aspect-[3/4] bg-white/[0.04] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {!b.is_active ? (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="px-2 py-1 rounded-md bg-gray-900/80 text-gray-300 text-[11px] border border-white/10">
                      비활성
                    </span>
                  </div>
                ) : null}
                <span className="absolute top-1.5 left-1.5 text-[10px] font-mono text-white/80 bg-black/50 rounded px-1.5 py-0.5">
                  #{b.sort_order ?? "—"}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <code className="text-[10px] text-gray-500 truncate">
                  {b.id.slice(0, 8)}…
                </code>
                <SimpleActiveToggle
                  endpoint={`/api/admin/backgrounds/${b.id}`}
                  initial={b.is_active}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
