// 체크포인트 "코스 진행방향" 정렬 — 앱 코스가이드(TrailMapScreen guideCheckpoints)와 동일.
// 각 체크포인트를 트레일 경로의 최근접점 인덱스로 매핑해 그 순서로 정렬한다.

import type { TrailSharePreview } from "@/lib/trail-preview";

export function orderByRouteProgress<T extends { lng: number; lat: number }>(
  cps: T[],
  coordinates: TrailSharePreview["coordinates"]
): T[] {
  if (!Array.isArray(coordinates) || coordinates.length === 0 || cps.length < 2)
    return cps;
  const first = coordinates[0] as unknown;
  const isMulti = Array.isArray(first) && Array.isArray((first as unknown[])[0]);
  const path = (
    isMulti ? (coordinates as number[][][]).flat() : (coordinates as number[][])
  ).map((c) => [c[0], c[1]] as [number, number]);
  if (path.length === 0) return cps;
  return [...cps]
    .map((cp) => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < path.length; i++) {
        const dx = path[i][0] - cp.lng;
        const dy = path[i][1] - cp.lat;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return { cp, i: best };
    })
    .sort((a, b) => a.i - b.i)
    .map((x) => x.cp);
}
