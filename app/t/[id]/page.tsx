import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Route, Footprints, Mountain, Layers } from "lucide-react";
import {
  fetchTrailSharePreview,
  trailCoverUrl,
  trailMapCoverUrl,
  type TrailSharePreview,
} from "@/lib/trail-preview";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/store-links";
import OpenAppButton from "./OpenAppButton";

// 지도 정보가 갱신될 수 있어 캐싱 방지
export const dynamic = "force-dynamic";

function subtitleOf(p: TrailSharePreview): string {
  const parts: string[] = [];
  if (p.series_name) parts.push(p.series_name);
  if (p.distance_km != null) parts.push(`${p.distance_km}km`);
  if (p.total_ascent_m != null) parts.push(`↑${Math.round(p.total_ascent_m)}m`);
  return parts.join(" · ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const preview = await fetchTrailSharePreview(id);
  if (!preview) {
    return { title: "지도 | Hilly Heally" };
  }
  const title = `${preview.name} | Hilly Heally 지도`;
  const descParts = [subtitleOf(preview), preview.course_summary ?? ""].filter(
    Boolean
  );
  const desc = descParts.join("\n") || "힐리힐리에서 이 지도를 만나보세요.";
  // 커버: 경로 선이 그려진 맵박스 정적 지도 우선, 없으면 체크포인트 사진
  const cover = trailMapCoverUrl(preview) ?? trailCoverUrl(preview);
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: cover ? [cover] : undefined,
      type: "website",
    },
  };
}

export default async function TrailSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preview = await fetchTrailSharePreview(id);
  if (!preview) notFound();

  const cover = trailMapCoverUrl(preview) ?? trailCoverUrl(preview);
  const subtitle = subtitleOf(preview);

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-md space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">다 함께 힐리힐리!</p>
          <h1 className="text-2xl font-bold">이 지도 보러 오세요</h1>
        </div>

        {/* 지도 카드 */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={preview.name}
              className="h-48 w-full object-cover"
            />
          ) : null}
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-2">
              <Layers className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
              <h2 className="text-xl font-semibold leading-snug">
                {preview.name}
              </h2>
            </div>

            <div className="space-y-2 text-sm">
              {subtitle ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mountain className="h-4 w-4 flex-shrink-0" />
                  <span>{subtitle}</span>
                </div>
              ) : null}
              {preview.course_summary ? (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Route className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{preview.course_summary}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Footprints className="h-4 w-4 flex-shrink-0" />
                <span>
                  {preview.map_type === "stamp" ? "스탬프 지도" : "코스 지도"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <OpenAppButton
          trailId={preview.trail_id}
          appStoreUrl={APP_STORE_URL}
          playStoreUrl={PLAY_STORE_URL}
        />

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          앱에서 열면 이 지도를 바로 볼 수 있어요.
        </p>
      </div>
    </main>
  );
}
