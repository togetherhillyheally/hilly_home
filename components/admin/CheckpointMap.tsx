"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { type LngLatBoundsLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { applyKoreanLabels } from "@/lib/mapbox-locale";
import {
  CHECKPOINT_MARKER_ICONS,
  type MarkerIcon,
} from "@/lib/checkpoint-marker-icons";

const TRAIL_COLOR = "#DC2F55";
const CP_COLOR = "#fb923c";
const CP_SELECTED_COLOR = "#f97316";
const CP_PENDING_COLOR = "#f59e0b";

type MapStyleKey = "outdoors" | "streets" | "satellite";

const MAPBOX_STYLES: Record<MapStyleKey, { url: string; label: string }> = {
  outdoors: {
    url: "mapbox://styles/mapbox/outdoors-v12",
    label: "지형",
  },
  streets: {
    url: "mapbox://styles/mapbox/streets-v12",
    label: "도로",
  },
  satellite: {
    url: "mapbox://styles/mapbox/satellite-streets-v12",
    label: "위성",
  },
};

type Coord = [number, number] | [number, number, number];
type Coordinates = Coord[] | Coord[][];

export type Checkpoint = {
  id: string;
  lng: number;
  lat: number;
  title: string;
  sort_order: number;
  marker_icon?: string | null;
};

export type LatLng = { lat: number; lng: number };

export type CheckpointMapProps = {
  coordinates: Coordinates;
  bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  checkpoints: Checkpoint[];
  selectedId?: string | null;
  /** 지도 클릭으로 새 체크포인트 추가 모드. activate 시 onMapClick 호출. */
  addMode?: boolean;
  /** 미확정 임시 위치 (지도 클릭으로 선택했으나 아직 저장 안 됨). */
  pendingPoint?: LatLng | null;
  onMapClick?: (point: LatLng) => void;
  onMarkerClick?: (cpId: string) => void;
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

function iconSvg(icon: MarkerIcon, size = 18): string {
  const paths = icon.paths
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${icon.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />`
    )
    .join("");
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}">${paths}</svg>`;
}

function makeCheckpointEl(
  num: number,
  bg: string,
  selected: boolean,
  markerIcon: string | null | undefined
): HTMLDivElement {
  const el = document.createElement("div");
  const iconName =
    markerIcon && CHECKPOINT_MARKER_ICONS[markerIcon] ? markerIcon : null;

  if (iconName) {
    // 아이콘 표시: 흰 원 + 컬러 아이콘 (숫자 없음)
    const icon = CHECKPOINT_MARKER_ICONS[iconName];
    const size = selected ? 36 : 32;
    el.style.cssText = `
      width: ${size}px; height: ${size}px; border-radius: 50%;
      background: #fff;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid ${selected ? "#f97316" : "#fff"};
      box-shadow: 0 1px 5px rgba(0,0,0,0.45);
      user-select: none; cursor: pointer;
      transition: transform .15s;
    `;
    el.innerHTML = iconSvg(icon, Math.round(size * 0.6));
  } else {
    // 기본: 순번 원 마커 (아이콘 미선택 시)
    const size = selected ? 32 : 28;
    el.style.cssText = `
      width: ${size}px; height: ${size}px; border-radius: 50%;
      background: ${bg}; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
      border: 2px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,0.45);
      user-select: none; cursor: pointer;
      transition: transform .15s;
    `;
    el.textContent = String(num);
  }
  return el;
}


function makePendingEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 32px; height: 32px; border-radius: 50%;
    background: ${CP_PENDING_COLOR}; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 800;
    border: 2px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,0.45);
    user-select: none; pointer-events: none;
    animation: cp-pulse 1s infinite alternate;
  `;
  el.textContent = "+";
  return el;
}

export default function CheckpointMap({
  coordinates,
  bounds,
  checkpoints,
  selectedId,
  addMode,
  pendingPoint,
  onMapClick,
  onMarkerClick,
  className,
  height = 480,
}: CheckpointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const pendingMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [styleKey, setStyleKey] = useState<MapStyleKey>("outdoors");
  const coordinatesRef = useRef(coordinates);
  coordinatesRef.current = coordinates;
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  // 콜백을 ref 로 보관
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const addModeRef = useRef(addMode);
  addModeRef.current = addMode;

  // 스타일 바뀌어도 재사용할 수 있게, 트레일 소스/레이어 + 한국어 라벨 을 재적용하는 헬퍼.
  // markers 는 DOM 요소라 style 변경 시 유지됨.
  const applyOverlay = (map: mapboxgl.Map, fitInitial: boolean) => {
    applyKoreanLabels(map);
    const coords = coordinatesRef.current;
    const bnd = boundsRef.current;
    const routes = toRoutes(coords);
    if (routes.length === 0) return;
    const geometry =
      routes.length === 1
        ? {
            type: "LineString" as const,
            coordinates: routes[0].map(([lng, lat]) => [lng, lat]),
          }
        : {
            type: "MultiLineString" as const,
            coordinates: routes.map((seg) =>
              seg.map(([lng, lat]) => [lng, lat])
            ),
          };
    if (map.getLayer("trail-line")) map.removeLayer("trail-line");
    if (map.getSource("trail")) map.removeSource("trail");
    map.addSource("trail", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry },
    });
    map.addLayer({
      id: "trail-line",
      type: "line",
      source: "trail",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": TRAIL_COLOR,
        "line-width": 3,
        "line-opacity": 0.85,
      },
    });

    if (!fitInitial) return;
    let fb: LngLatBoundsLike;
    if (bnd) {
      fb = [
        [bnd.minLon, bnd.minLat],
        [bnd.maxLon, bnd.maxLat],
      ];
    } else {
      const flat = flatten(coords);
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
      fb = [
        [minLon, minLat],
        [maxLon, maxLat],
      ];
    }
    map.fitBounds(fb, { padding: 50, animate: false });
  };

  // 스타일 변경 시 setStyle + 스타일 로드 후 오버레이 재적용
  // 초기 마운트는 스킵 — 지도 init 이 이미 outdoors 로 스타일을 로딩 중이라
  // setStyle 을 중복 호출하면 "load" 이벤트가 삼켜져 마커 등 다른 useEffect 가 깨짐.
  const initialStyleMount = useRef(true);
  useEffect(() => {
    if (initialStyleMount.current) {
      initialStyleMount.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const target = MAPBOX_STYLES[styleKey].url;
    map.setStyle(target);
    map.once("style.load", () => applyOverlay(map, false));
  }, [styleKey]);

  // 지도 초기화 — coordinates/bounds 가 바뀌면 새로 그림
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;

    const flat = flatten(coordinates);
    if (flat.length === 0) return;

    const initialCenter: [number, number] = bounds
      ? [
          (bounds.minLon + bounds.maxLon) / 2,
          (bounds.minLat + bounds.maxLat) / 2,
        ]
      : [flat[0][0], flat[0][1]];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLES.outdoors.url,
      center: initialCenter,
      zoom: 11,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.on("click", (e) => {
      if (addModeRef.current && onMapClickRef.current) {
        onMapClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    map.on("load", () => applyOverlay(map, true));

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      pendingMarkerRef.current = null;
    };
  }, [coordinates, bounds]);

  // 체크포인트 마커 동기화
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      // 기존 마커 정리
      for (const [, marker] of markersRef.current) marker.remove();
      markersRef.current.clear();

      for (const cp of checkpoints) {
        const isSel = selectedId === cp.id;
        const el = makeCheckpointEl(
          cp.sort_order,
          isSel ? CP_SELECTED_COLOR : CP_COLOR,
          isSel,
          cp.marker_icon ?? null
        );
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          onMarkerClickRef.current?.(cp.id);
        });
        const m = new mapboxgl.Marker(el)
          .setLngLat([cp.lng, cp.lat])
          .addTo(map);
        markersRef.current.set(cp.id, m);
      }
    };

    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [checkpoints, selectedId]);

  // pending 마커
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pendingMarkerRef.current?.remove();
    pendingMarkerRef.current = null;
    if (!pendingPoint) return;
    const el = makePendingEl();
    pendingMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([pendingPoint.lng, pendingPoint.lat])
      .addTo(map);
  }, [pendingPoint]);

  // 모드별 커서
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = addMode ? "crosshair" : "";
    return () => {
      canvas.style.cursor = "";
    };
  }, [addMode]);

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
      className={
        "relative rounded-xl overflow-hidden border border-white/10 " +
        (className ?? "")
      }
      style={{ height, width: "100%" }}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
      />
      <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 p-0.5 text-[11px] font-semibold">
        {(Object.keys(MAPBOX_STYLES) as MapStyleKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setStyleKey(k)}
            className={`h-7 px-2.5 rounded transition ${
              styleKey === k
                ? "bg-white text-black"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            {MAPBOX_STYLES[k].label}
          </button>
        ))}
      </div>
    </div>
  );
}
