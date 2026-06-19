import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import CheckpointsEditor, { type CheckpointRow, type PhotoRow } from "./CheckpointsEditor";

export const dynamic = "force-dynamic";

type TrailLite = {
  id: string;
  name: string;
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

export default async function CheckpointsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows: trailRows } = await adminList<TrailLite>(
    `trails?select=id,name,bounds,coordinates&id=eq.${id}`
  );
  const trail = trailRows[0];
  if (!trail) notFound();

  const { rows: cps } = await adminList<CheckpointRow>(
    `trail_checkpoints?select=id,trail_id,sort_order,title,lng,lat,note,marker_icon&trail_id=eq.${id}&order=sort_order.asc`
  );

  // 선택된 체크포인트 사진은 클라이언트에서 lazy fetch — 초기에는 빈 배열
  const initialPhotos: Record<string, PhotoRow[]> = {};

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <Link
          href={`/admin/trails/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          {trail.name}
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          체크포인트 편집
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          지도를 클릭해 체크포인트를 추가하거나, 사진을 올려 EXIF 위치 정보로
          자동 등록할 수 있어요.
        </p>
      </header>

      {trail.coordinates && trail.coordinates.length > 0 ? (
        <CheckpointsEditor
          trailId={trail.id}
          coordinates={trail.coordinates}
          bounds={trail.bounds}
          initialCheckpoints={cps}
          initialPhotos={initialPhotos}
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          이 지도에는 좌표 데이터가 없습니다. 먼저 GPX를 업로드해주세요.
        </div>
      )}
    </main>
  );
}
