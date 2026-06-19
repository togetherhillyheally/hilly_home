/**
 * 좌표 거리 계산 유틸 (Haversine formula) — hilly_rn/lib/utils/geo.ts에서 그대로 포팅
 */

const R = 6371e3; // 지구 반지름 (미터)
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineM(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  return haversineMeters(a.lat, a.lon, b.lat, b.lon);
}

export interface LatLonBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}
