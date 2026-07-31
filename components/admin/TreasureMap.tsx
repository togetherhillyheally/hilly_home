"use client";

/**
 * 보물 배치 미리보기 지도 — 코스 경로(라인) + 보물 마커(번호).
 * 읽기 전용(클릭 편집 없음). TrailMapPreview + StampMap 패턴 재사용.
 */
import { useEffect, useRef } from "react";
import mapboxgl, { type LngLatBoundsLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { applyKoreanLabels } from "@/lib/mapbox-locale";

const MAPBOX_STYLE = "mapbox://styles/mapbox/outdoors-v12";
const ROUTE_COLOR = "#DC2F55";

// 보물마다 다른 보석 색 (seq 순환) — 앱과 동일 팔레트
const GEM_PALETTE = [
  "#E8B84B", // 금
  "#E0455E", // 루비
  "#22B573", // 에메랄드
  "#3A8DDE", // 사파이어
  "#9B5FD0", // 자수정
  "#EC8C3C", // 토파즈
];

type Coord = [number, number] | [number, number, number];
type Coordinates = Coord[] | Coord[][];

export type TreasurePoint = {
  id: string;
  seq: number;
  lng: number;
  lat: number;
  cell_index: number;
};

export type TreasureMapProps = {
  coordinates: Coordinates;
  treasures: TreasurePoint[];
  className?: string;
  height?: number | string;
};

function isMulti(coords: Coordinates): coords is Coord[][] {
  return (
    coords.length > 0 &&
    Array.isArray(coords[0]) &&
    coords[0].length > 0 &&
    Array.isArray((coords[0] as unknown[])[0])
  );
}
function flatten(coords: Coordinates): Coord[] {
  return isMulti(coords) ? coords.flat() : (coords as Coord[]);
}
function toRoutes(coords: Coordinates): Coord[][] {
  if (isMulti(coords)) return coords;
  if (coords.length === 0) return [];
  return [coords as Coord[]];
}

// MaterialCommunityIcons "treasure-chest" 경로 (앱 마커와 동일 아이콘)
const CHEST_PATH =
  "M5,4H19A3,3 0 0,1 22,7V17A3,3 0 0,1 19,20H5A3,3 0 0,1 2,17V7A3,3 0 0,1 5,4M12,7A2,2 0 0,0 10,9C10,9.74 10.4,10.39 11,10.73V13H13V10.73C13.6,10.39 14,9.74 14,9A2,2 0 0,0 12,7M4,7V9H8.54C8.71,8.61 8.93,8.26 9.2,7.95C8.5,7.36 7.79,7 7,7H4M15.46,9H20V7H17C16.21,7 15.5,7.36 14.8,7.95C15.07,8.26 15.29,8.61 15.46,9M4,11V17A1,1 0 0,0 5,18H9V15.27C8.61,15.65 8.07,15.9 7.5,15.96V14C8.15,13.85 8.7,13.5 9.13,13H4V11M14.87,13C15.3,13.5 15.85,13.85 16.5,14V15.96C15.93,15.9 15.39,15.65 15,15.27V18H19A1,1 0 0,0 20,17V11H14.87Z";

function makeTreasureEl(color: string, title: string): HTMLDivElement {
  const el = document.createElement("div");
  el.title = title;
  // 스탬프/체크포인트 마커와 동일 결 — 흰 버블 + 브랜드 색 보더·아이콘
  el.style.cssText = `
    width: 30px; height: 30px; border-radius: 50%;
    background: #F4F4F5;
    display: flex; align-items: center; justify-content: center;
    border: 2.5px solid ${color}; box-shadow: 0 1px 5px rgba(0,0,0,0.4);
    user-select: none; cursor: default;
  `;
  el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="${CHEST_PATH}"/></svg>`;
  return el;
}

export default function TreasureMap({
  coordinates,
  treasures,
  className,
  height = 420,
}: TreasureMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // 지도 초기화 + 경로 라인 (coordinates 변경 시 재초기화)
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;

    const flat = flatten(coordinates);
    if (flat.length === 0) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [flat[0][0], flat[0][1]],
      zoom: 11,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.on("load", () => {
      applyKoreanLabels(map);
      const routes = toRoutes(coordinates);
      const geometry =
        routes.length === 1
          ? {
              type: "LineString" as const,
              coordinates: routes[0].map(([lng, lat]) => [lng, lat]),
            }
          : {
              type: "MultiLineString" as const,
              coordinates: routes.map((seg) => seg.map(([lng, lat]) => [lng, lat])),
            };
      map.addSource("trail", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry },
      });
      map.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": ROUTE_COLOR, "line-width": 3, "line-opacity": 0.85 },
      });

      let minLat = Infinity,
        maxLat = -Infinity,
        minLon = Infinity,
        maxLon = -Infinity;
      for (const [lng, lat] of flat) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLon) minLon = lng;
        if (lng > maxLon) maxLon = lng;
      }
      const fb: LngLatBoundsLike = [
        [minLon, minLat],
        [maxLon, maxLat],
      ];
      map.fitBounds(fb, { padding: 48, animate: false });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [coordinates]);

  // 보물 마커 동기화
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const ordered = [...treasures].sort((a, b) => a.seq - b.seq);
      ordered.forEach((t, i) => {
        const gem = GEM_PALETTE[t.seq % GEM_PALETTE.length];
        const el = makeTreasureEl(gem, `보물 ${i + 1} · 조각 #${t.cell_index}`);
        const marker = new mapboxgl.Marker(el).setLngLat([t.lng, t.lat]).addTo(map);
        markersRef.current.push(marker);
      });
    };
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [treasures]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return (
      <div
        className={
          "rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-gray-500 " +
          (className ?? "")
        }
        style={{ height }}
      >
        Mapbox 토큰이 설정되지 않았어요.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={"rounded-xl overflow-hidden border border-white/10 " + (className ?? "")}
      style={{ height, width: "100%" }}
    />
  );
}
