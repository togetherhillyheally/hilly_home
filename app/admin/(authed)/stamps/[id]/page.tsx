import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import StampEditor, { type StampPointRow } from "./StampEditor";

export const dynamic = "force-dynamic";

type StampTrail = {
  id: string;
  name: string;
  series_name: string | null;
  is_active: boolean;
  map_type: string | null;
  stamp_order_mode: string | null;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } | null;
};

const ORDER_LABELS: Record<string, string> = {
  free: "자유",
  ordered: "순서",
  random: "랜덤",
};

export default async function StampMapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows: trails } = await adminList<StampTrail>(
    `trails?select=id,name,series_name,is_active,map_type,stamp_order_mode,bounds&id=eq.${id}`
  );
  const trail = trails[0];
  if (!trail) notFound();

  const { rows: points } = await adminList<StampPointRow>(
    `stamp_points?select=id,trail_id,title,hint,lng,lat,sort_order&trail_id=eq.${id}&order=sort_order.asc`
  );

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <Link
          href="/admin/stamps"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          스탬프 지도 목록
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {trail.name}
          </h1>
          {trail.is_active ? (
            <span className="inline-flex items-center px-2 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
              활성
            </span>
          ) : (
            <span className="inline-flex items-center px-2 h-6 rounded-md bg-white/[0.06] border border-white/10 text-gray-400 text-[11px] font-medium">
              비활성
            </span>
          )}
          {trail.stamp_order_mode && (
            <span className="inline-flex items-center px-2 h-6 rounded-md bg-white/[0.04] border border-white/10 text-gray-300 text-[11px] font-medium">
              순서 모드: {ORDER_LABELS[trail.stamp_order_mode] ?? trail.stamp_order_mode}
            </span>
          )}
        </div>
        {trail.series_name && (
          <p className="text-sm text-gray-400 mt-1.5">
            시리즈: <span className="text-gray-300">{trail.series_name}</span>
          </p>
        )}
      </header>

      <StampEditor
        trailId={trail.id}
        initialPoints={points}
        initialBounds={trail.bounds}
      />
    </main>
  );
}
