/**
 * 코스 가이드 — 앱 TrailGuidePanel 미리보기.
 * 진행방향 순서로 [순번·아이콘·제목 / 사진 / 소개] 블록이 이어진다 (서버 컴포넌트).
 */
import {
  AlertCircle,
  AlertTriangle,
  Bed,
  Camera,
  Coffee,
  Droplet,
  Flag,
  Flame,
  Home,
  Leaf,
  Navigation,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export type GuideCheckpoint = {
  id: string;
  title: string;
  note: string | null;
  marker_icon: string | null;
  lng: number;
  lat: number;
  photos: string[];
};

// 앱 TrailMapScreen MARKER_ACCENTS 와 동일한 이름·색 매핑
const ICON_MAP: Record<string, { Icon: LucideIcon; color: string }> = {
  "flag-outline": { Icon: Flag, color: "#DC2F55" },
  "camera-outline": { Icon: Camera, color: "#7C3AED" },
  "water-outline": { Icon: Droplet, color: "#0284C7" },
  "leaf-outline": { Icon: Leaf, color: "#059669" },
  "alert-outline": { Icon: AlertCircle, color: "#DC2626" },
  "warning-outline": { Icon: AlertTriangle, color: "#D97706" },
  "cafe-outline": { Icon: Coffee, color: "#A16207" },
  "restaurant-outline": { Icon: Utensils, color: "#EA580C" },
  "bonfire-outline": { Icon: Flame, color: "#E11D48" },
  "navigate-outline": { Icon: Navigation, color: "#0891B2" },
  "bed-outline": { Icon: Bed, color: "#1E40AF" },
  "home-outline": { Icon: Home, color: "#16A34A" },
};

export default function CheckpointGuide({
  checkpoints,
}: {
  checkpoints: GuideCheckpoint[];
}) {
  if (checkpoints.length === 0) return null;
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider">
        코스 가이드
      </h3>
      <p className="text-[11px] text-gray-600 mb-5">
        앱 코스가이드와 동일한 진행방향 순서 · {checkpoints.length}개 기록
      </p>

      <ol className="space-y-7">
        {checkpoints.map((cp, i) => {
          const { Icon, color } =
            ICON_MAP[cp.marker_icon ?? ""] ?? ICON_MAP["flag-outline"];
          return (
            <li key={cp.id}>
              {/* 순번 · 아이콘 · 제목 */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-black/10"
                  style={{ backgroundColor: "#F4F4F5" }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </span>
                <span className="text-[11px] font-mono text-gray-500 flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-semibold text-white truncate">
                  {cp.title}
                </span>
              </div>

              {/* 사진 (가로 스크롤) */}
              {cp.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 mb-2.5">
                  {cp.photos.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt={cp.title}
                      loading="lazy"
                      className="w-36 h-36 rounded-lg object-cover flex-shrink-0 border border-white/10"
                    />
                  ))}
                </div>
              )}

              {/* 소개 — 줄바꿈 유지 */}
              {cp.note?.trim() ? (
                <p className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-line">
                  {cp.note.trim()}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
