import Link from "next/link";
import { ChevronLeft, Gem } from "lucide-react";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

type MapKind = "adventure" | "treasure";

export default async function TrailUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ map_type?: string }>;
}) {
  const sp = await searchParams;
  const mapType: MapKind = sp.map_type === "treasure" ? "treasure" : "adventure";
  const isTreasure = mapType === "treasure";
  const backHref = isTreasure ? "/admin/treasures" : "/admin/trails";
  const backLabel = isTreasure ? "보물 지도 목록" : "코스 지도 목록";
  const title = isTreasure ? "새 보물 지도 (GPX / KML 업로드)" : "GPX / KML 업로드";
  const subtitle = isTreasure
    ? "경로용 GPX/KML을 올리면 보물지도로 등록돼요. 등록 후 상세에서 보물 개수와 보상 풀을 설정하세요."
    : "GPX 또는 KML 파일을 올려 새 코스 지도를 등록합니다. 여러 파일을 동시에 올리면 하나의 멀티 경로 코스로 합쳐 저장됩니다.";

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          {isTreasure ? (
            <Gem className="h-6 w-6 shrink-0" style={{ color: "#F2B705" }} />
          ) : null}
          <span>{title}</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
      </header>

      <UploadForm mapType={mapType} />
    </main>
  );
}
