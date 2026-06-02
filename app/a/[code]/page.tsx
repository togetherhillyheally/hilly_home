import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, MapPin, User, Lock, Clock } from "lucide-react";
import { fetchSessionInvitePreview } from "@/lib/invite-preview";
import OpenAppButton from "./OpenAppButton";

// 카톡 등에서 URL 캐싱 방지 — 코드가 회전될 수 있음
export const dynamic = "force-dynamic";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.hillyheally.app";
// TODO: App Store ID 발급 후 채우기
const APP_STORE_URL: string | undefined = undefined;

function formatMeetingAt(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const preview = await fetchSessionInvitePreview(code);
  if (!preview) {
    return { title: "모험 초대 | Hilly Heally" };
  }
  const title = `${preview.title} | Hilly Heally 모험 초대`;
  const desc = `${preview.mountain_name} · ${formatMeetingAt(
    preview.meeting_at
  )}${preview.host_nickname ? ` · ${preview.host_nickname} 호스트` : ""}`;
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: preview.cover_image_url ? [preview.cover_image_url] : undefined,
      type: "website",
    },
  };
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const preview = await fetchSessionInvitePreview(code);
  if (!preview) notFound();

  const isJoinable = !preview.expired && preview.status === "open";

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-md space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">다 함께 힐리힐리!</p>
          <h1 className="text-2xl font-bold">함께 모험을 떠나요</h1>
        </div>

        {/* 모험 카드 */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {preview.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.cover_image_url}
              alt={preview.title}
              className="h-48 w-full object-cover"
            />
          ) : null}
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-2">
              {preview.is_private ? (
                <Lock className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
              ) : null}
              <h2 className="text-xl font-semibold leading-snug">
                {preview.title}
              </h2>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>
                  {preview.mountain_name}
                  {preview.meeting_place ? ` · ${preview.meeting_place}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>{formatMeetingAt(preview.meeting_at)}</span>
              </div>
              {preview.host_nickname ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span>{preview.host_nickname} 호스트</span>
                </div>
              ) : null}
            </div>

            {/* 상태 배지 */}
            {!isJoinable ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {preview.expired
                    ? "이미 종료된 모험이에요"
                    : preview.status === "cancelled"
                      ? "취소된 모험이에요"
                      : "참가할 수 없는 모험이에요"}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* CTA */}
        {isJoinable ? (
          <OpenAppButton
            code={code.toUpperCase()}
            appStoreUrl={APP_STORE_URL}
            playStoreUrl={PLAY_STORE_URL}
          />
        ) : null}

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          앱에서 열면 자동으로 모험에 참가돼요.{"\n"}
          링크는 호스트가 새로 발급하면 만료될 수 있어요.
        </p>
      </div>
    </main>
  );
}
