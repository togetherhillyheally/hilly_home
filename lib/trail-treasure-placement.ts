/**
 * 보물지도 배치 시뮬레이션 — 앱(hilly_rn)의 computeTreasureHuntPlacement 와 동일.
 * BO 에서 "경로상 배치가 어떻게 되는지" 샘플 미리보기 용으로만 사용.
 * (실제 세션 좌표는 세션 시작 시 방장 디바이스가 다시 뽑는다 — 결과는 매번 다름)
 */
import { haversineMeters } from "@/lib/geo";

export interface TreasurePlacement {
  seq: number;
  lat: number;
  lng: number;
}

export const TREASURE_HUNT = {
  CLAIM_RADIUS_M: 25,
  HINT_RADIUS_M: 100,
  NEAR_RADIUS_M: 50,
  OFFSET_MAX_M: 50,
  MIN_SPACING_M: 150,
  EDGE_MARGIN_M: 50,
} as const;

type LngLat = [number, number];
type Coord = [number, number] | [number, number, number];
type Coordinates = Coord[] | Coord[][];

function flatten(coords: Coordinates | null | undefined): LngLat[] {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  const first = coords[0] as unknown;
  const isMulti =
    Array.isArray(first) &&
    (first as unknown[]).length > 0 &&
    Array.isArray((first as unknown[])[0]);
  const routes: unknown[] = isMulti ? (coords as unknown[]) : [coords];
  const out: LngLat[] = [];
  for (const route of routes) {
    if (!Array.isArray(route)) continue;
    for (const pt of route as unknown[]) {
      if (
        Array.isArray(pt) &&
        typeof pt[0] === "number" &&
        typeof pt[1] === "number"
      ) {
        out.push([pt[0], pt[1]]);
      }
    }
  }
  return out;
}

function pointAndDirAt(
  coords: LngLat[],
  prefix: number[],
  d: number
): { p: LngLat; dir: [number, number] } {
  const total = prefix[prefix.length - 1];
  const dd = Math.min(Math.max(0, d), total);
  let lo = 0;
  let hi = prefix.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (prefix[mid] < dd) lo = mid + 1;
    else hi = mid;
  }
  const j = Math.max(1, lo);
  const a = coords[j - 1];
  const b = coords[j];
  const segLen = prefix[j] - prefix[j - 1] || 1;
  const t = (dd - prefix[j - 1]) / segLen;
  const p: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const cosLat = Math.cos((p[1] * Math.PI) / 180);
  const ex = (b[0] - a[0]) * cosLat * 111_320;
  const ny = (b[1] - a[1]) * 110_540;
  const len = Math.hypot(ex, ny) || 1;
  return { p, dir: [ex / len, ny / len] };
}

function offsetMeters(p: LngLat, east: number, north: number): LngLat {
  const cosLat = Math.cos((p[1] * Math.PI) / 180) || 1e-6;
  return [p[0] + east / (111_320 * cosLat), p[1] + north / 110_540];
}

export function computeTreasureHuntPlacement(
  coordinates: Coordinates | null | undefined,
  count: number
): TreasurePlacement[] {
  const coords = flatten(coordinates);
  if (coords.length < 2 || count <= 0) return [];
  const prefix: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    prefix.push(
      prefix[i - 1] +
        haversineMeters(
          coords[i - 1][1],
          coords[i - 1][0],
          coords[i][1],
          coords[i][0]
        )
    );
  }
  const total = prefix[prefix.length - 1];
  const usable = total - TREASURE_HUNT.EDGE_MARGIN_M * 2;
  if (usable <= 0) return [];

  const spacing = Math.min(
    TREASURE_HUNT.MIN_SPACING_M,
    usable / Math.max(1, count)
  );
  const chosen: number[] = [];
  let tries = 0;
  while (chosen.length < count && tries < count * 60) {
    tries++;
    const d = TREASURE_HUNT.EDGE_MARGIN_M + Math.random() * usable;
    if (chosen.every((c) => Math.abs(c - d) >= spacing)) chosen.push(d);
  }
  chosen.sort((a, b) => a - b);

  return chosen.map((d, i) => {
    const { p, dir } = pointAndDirAt(coords, prefix, d);
    const side = Math.random() < 0.5 ? -1 : 1;
    const off = Math.random() * TREASURE_HUNT.OFFSET_MAX_M;
    const q = offsetMeters(p, -dir[1] * off * side, dir[0] * off * side);
    return { seq: i + 1, lng: q[0], lat: q[1] };
  });
}
