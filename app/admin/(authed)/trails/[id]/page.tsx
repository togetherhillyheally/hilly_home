import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  ChevronRight,
  Mountain,
  TrendingUp,
  Footprints,
} from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import EditForm from "./EditForm";
import StartEndEditor from "./StartEndEditor";
import ReplaceGpxForm from "./ReplaceGpxForm";
import ShareImageButton from "./ShareImageButton";

export const dynamic = "force-dynamic";

type Trail = {
  id: string;
  name: string;
  series_name: string | null;
  course_summary: string | null;
  map_type: string | null;
  distance_km: number | null;
  total_ascent_m: number | null;
  activity_types: string[] | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  source: string | null;
  gpx_storage_bucket: string | null;
  gpx_storage_path: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } | null;
  coordinates:
    | ([number, number] | [number, number, number])[]
    | ([number, number] | [number, number, number])[][]
    | null;
};

type ProfileMini = { id: string; nickname: string | null };

const ACTIVITY_LABELS: Record<string, string> = {
  walking: "걷기",
  running: "달리기",
  cycling: "자전거",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TrailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows } = await adminList<Trail>(
    `trails?select=id,name,series_name,course_summary,map_type,distance_km,total_ascent_m,activity_types,sort_order,is_active,created_at,created_by,source,gpx_storage_bucket,gpx_storage_path,start_lat,start_lng,end_lat,end_lng,bounds,coordinates&id=eq.${id}`
  );
  const trail = rows[0];
  if (!trail) notFound();

  let creatorNickname: string | null = null;
  if (trail.created_by) {
    const { rows: cs } = await adminList<ProfileMini>(
      `profiles?select=id,nickname&id=eq.${trail.created_by}`
    );
    creatorNickname = cs[0]?.nickname ?? null;
  }

  // 체크포인트 개수
  const { total: checkpointCount } = await adminList<{ id: string }>(
    `trail_checkpoints?select=id&trail_id=eq.${id}`,
    { count: true, from: 0, to: 0 }
  );

  const activityLabels =
    trail.activity_types
      ?.map((a) => ACTIVITY_LABELS[a] ?? a)
      .filter(Boolean) ?? [];

  return (
    <main className="p-6 lg:p-10">
      {/* ───── 헤더 ───── */}
      <header className="mb-6">
        <Link
          href="/admin/trails"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          코스 지도 목록
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          </div>
          <ShareImageButton
            trailId={trail.id}
            trailName={trail.name}
            seriesName={trail.series_name}
            courseSummary={trail.course_summary}
            distanceKm={trail.distance_km}
            totalAscentM={trail.total_ascent_m}
            mapType={
              trail.map_type === "stamp" ? "stamp" : "adventure"
            }
            coordinates={trail.coordinates}
          />
        </div>
        {trail.series_name && (
          <p className="text-sm text-gray-400 mt-1.5">
            시리즈: <span className="text-gray-300">{trail.series_name}</span>
          </p>
        )}
      </header>

      {/* ───── 빠른 정보 + 액션 (KPI 4칸 + 체크포인트 진입) ───── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 uppercase tracking-wider mb-1.5">
            <Mountain className="h-3.5 w-3.5" />
            거리
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {trail.distance_km != null
              ? `${Number(trail.distance_km).toFixed(1)}`
              : "—"}
            <span className="text-sm font-medium text-gray-500 ml-1">km</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 uppercase tracking-wider mb-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            누적 상승
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {trail.total_ascent_m != null ? trail.total_ascent_m : "—"}
            <span className="text-sm font-medium text-gray-500 ml-1">m</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 uppercase tracking-wider mb-1.5">
            <Footprints className="h-3.5 w-3.5" />
            활동 유형
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {activityLabels.length > 0 ? activityLabels.join(" · ") : "—"}
          </div>
        </div>

        <Link
          href={`/admin/trails/${trail.id}/checkpoints`}
          className="rounded-xl border border-orange-500/30 bg-orange-500/[0.06] hover:bg-orange-500/[0.12] hover:border-orange-500/50 p-4 transition-colors group"
        >
          <div className="flex items-center gap-1.5 text-[11px] text-orange-300 uppercase tracking-wider mb-1.5">
            <MapPin className="h-3.5 w-3.5" />
            체크포인트
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-white font-mono">
              {checkpointCount}
              <span className="text-sm font-medium text-gray-500 ml-1">개</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-orange-300 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-[10px] text-gray-500 mt-1.5">
            클릭해서 편집 →
          </div>
        </Link>
      </div>

      {/* ───── 본문 2-col ───── */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Left: 지도 + 시작/끝 편집 */}
        <div className="space-y-5">
          {trail.coordinates && trail.coordinates.length > 0 && (
            <StartEndEditor
              trailId={trail.id}
              coordinates={trail.coordinates}
              bounds={trail.bounds}
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
          )}

          {/* 보조 메타 정보 (생성자·생성일·소스·정렬·GPX 경로) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wider">
              관리 정보
            </h3>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-gray-500">생성자</dt>
              <dd className="text-white text-right">
                {creatorNickname ?? "(없음)"}
              </dd>

              <dt className="text-gray-500">생성일</dt>
              <dd className="text-white text-right text-xs">
                {formatDate(trail.created_at)}
              </dd>

              <dt className="text-gray-500">소스</dt>
              <dd className="text-right">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[11px] font-mono text-gray-300">
                  {trail.source ?? "—"}
                </span>
              </dd>

              <dt className="text-gray-500">맵 타입</dt>
              <dd className="text-right">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[11px] font-mono text-gray-300">
                  {trail.map_type ?? "—"}
                </span>
              </dd>

              <dt className="text-gray-500">정렬 순서</dt>
              <dd className="text-white text-right font-mono">
                {trail.sort_order ?? "—"}
              </dd>
            </dl>

            {trail.gpx_storage_path && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  GPX 저장 경로
                </div>
                <div className="text-[11px] text-gray-400 font-mono break-all">
                  {trail.gpx_storage_bucket}/{trail.gpx_storage_path}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: 메타 편집 + GPX 교체 + 위험 구역 */}
        <EditForm
          trailId={trail.id}
          initialName={trail.name}
          initialSeriesName={trail.series_name}
          initialCourseSummary={trail.course_summary}
          initialActivityTypes={
            (trail.activity_types ?? []) as (
              | "walking"
              | "running"
              | "cycling"
            )[]
          }
        >
          <ReplaceGpxForm
            trailId={trail.id}
            currentDistanceKm={trail.distance_km}
            currentTotalAscentM={trail.total_ascent_m}
          />
        </EditForm>
      </div>
    </main>
  );
}
