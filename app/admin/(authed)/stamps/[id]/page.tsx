import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import StampEditor, { type StampPointRow } from "./StampEditor";
import TrailNameEdit from "./TrailNameEdit";

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
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
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
    `trails?select=id,name,series_name,is_active,map_type,stamp_order_mode,bounds,start_lat,start_lng,end_lat,end_lng&id=eq.${id}`
  );
  const trail = trails[0];
  if (!trail) notFound();

  const { rows: points } = await adminList<StampPointRow>(
    `stamp_points?select=id,trail_id,title,hint,lng,lat,sort_order,radius_m,quiz_question,quiz_choices,quiz_answer_index&trail_id=eq.${id}&order=sort_order.asc`
  );

  // 파밍박스 — 테이블이 없거나 실패해도 페이지는 뜨게
  const { rows: farmBoxes } = await adminList<{ id: string; title: string; lat: number; lng: number }>(
    `trail_farm_boxes?select=id,title,lat,lng&trail_id=eq.${id}&order=sort_order.asc`
  ).catch(() => ({ rows: [] as { id: string; title: string; lat: number; lng: number }[] }));

  return (
    // lg: 페이지를 뷰포트 높이로 고정 — 헤더·지도는 안 움직이고 우측 목록만 내부 스크롤
    <main className="p-6 lg:p-10 lg:h-screen lg:flex lg:flex-col lg:overflow-hidden">
      <header className="mb-6 shrink-0">
        <Link
          href="/admin/stamps"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          ROUTE 목록
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <TrailNameEdit trailId={trail.id} initialName={trail.name} />
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

      <div className="lg:flex-1 lg:min-h-0">
      <StampEditor
        trailId={trail.id}
        initialPoints={points}
        initialFarmBoxes={farmBoxes}
        initialBounds={trail.bounds}
        initialStart={
          trail.start_lat != null && trail.start_lng != null
            ? { lat: trail.start_lat, lng: trail.start_lng }
            : null
        }
        initialEnd={
          trail.end_lat != null && trail.end_lng != null
            ? { lat: trail.end_lat, lng: trail.end_lng }
            : null
        }
      />
      </div>
    </main>
  );
}
