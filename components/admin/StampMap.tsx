"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import mapboxgl, { type LngLatBoundsLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { parseStampTitle, TIER_COLOR } from "@/lib/stamp-pool";
import { applyKoreanLabels } from "@/lib/mapbox-locale";
import { syncRadiusCircles, type RadiusCircle } from "./radius-layer";

const MAPBOX_STYLE = "mapbox://styles/mapbox/outdoors-v12";
const PENDING_COLOR = "#f59e0b";
const SELECTED_RING = "#ffffff";
const START_COLOR = "#22c55e";
const END_COLOR = "#DC2F55";
/** start≈end 간주 임계값 (약 50m) — 동일 지점이면 S/E 로 합쳐서 표시 */
const SE_CLOSE_THRESHOLD = 0.0005;

export type StampPoint = {
  id: string;
  title: string;
  lng: number;
  lat: number;
  sort_order: number;
};

export type LatLng = { lat: number; lng: number };

/** 지도 클릭이 어떤 "지정" 모드인지. 'point' = 새 스탬프 추가, 'start' / 'end' = 출발·도착 지정 */
export type AddMode = "point" | "start" | "end";

export type StampMapProps = {
  points: StampPoint[];
  bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  /** 첫 마운트 시 사용할 fallback 중심 (포인트가 없는 새 지도용). 한국 중부. */
  fallbackCenter?: [number, number];
  selectedId?: string | null;
  /** true = 'point' 모드 호환. AddMode 로 세분화된 클라이언트는 setAddMode 로 전환 */
  addMode?: boolean | AddMode;
  pendingPoint?: LatLng | null;
  /** 선택된 스탬프 등 도착 반경 원으로 표시할 포인트 */
  radiusCircles?: RadiusCircle[];
  /** 마커 드래그로 위치 이동 — 드래그 종료 시 호출 (lng/lat) */
  onPointDragEnd?: (pointId: string, p: LatLng) => void;
  /** 출발/도착 좌표 — 없으면 마커 미표시. S/E 가 서로 50m 이내면 "S/E" 로 합침 */
  start?: LatLng | null;
  end?: LatLng | null;
  onMapClick?: (p: LatLng, mode: AddMode) => void;
  onMarkerClick?: (pointId: string) => void;
  className?: string;
  height?: number | string;
};

function MarkerContent({
  point,
  selected,
}: {
  point: StampPoint;
  selected: boolean;
}) {
  const { entry, name, score } = parseStampTitle(point.title);

  // 점수가 있으면 PO 이벤트 코스 지도(gwanggyo-cps) 와 동일한 스타일 —
  // 색상 배경 + 숫자 + 점선 outline. hilly_po/components/events/CourseMap.tsx 참고.
  if (score != null) {
    const color = TIER_COLOR[score];
    return (
      <div
        title={`${name || `#${point.sort_order}`} · ${score}점`}
        style={{
          width: selected ? 36 : 30,
          height: selected ? 36 : 30,
          borderRadius: "50%",
          background: color,
          border: selected ? "3px solid #fff" : "2px solid #fff",
          outline: `2px dashed ${color}`,
          outlineOffset: "1.5px",
          boxShadow: selected
            ? "0 0 0 3px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.45)"
            : "0 1px 5px rgba(0,0,0,0.35)",
          color: "#fff",
          fontSize: selected ? 13 : 11,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "transform .15s, box-shadow .15s",
        }}
      >
        {score}
      </div>
    );
  }

  const color = entry?.color ?? "#fb923c";
  const Icon = entry?.Icon;
  return (
    <div
      title={name || `${point.sort_order}번째 스탬프`}
      style={{
        width: selected ? 36 : 32,
        height: selected ? 36 : 32,
        borderRadius: "50%",
        background: "#ffffff",
        border: `2.5px solid ${color}`,
        boxShadow: selected
          ? `0 0 0 3px ${SELECTED_RING}, 0 2px 6px rgba(0,0,0,0.45)`
          : `0 1px 4px rgba(0,0,0,0.4)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "transform .15s, box-shadow .15s",
      }}
    >
      {Icon ? (
        <Icon
          width={selected ? 18 : 16}
          height={selected ? 18 : 16}
          color={color}
          strokeWidth={2.2}
        />
      ) : (
        <span
          style={{
            color,
            fontWeight: 800,
            fontSize: 13,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {point.sort_order}
        </span>
      )}
    </div>
  );
}

// React 18의 createRoot는 부모 트리가 아직 렌더링/커밋 중일 때 동기적으로
// unmount 되면 "Attempted to synchronously unmount a root while React was
// already rendering" 에러를 던진다. 마커 root의 unmount는 다음 tick으로
// 미뤄서 현재 렌더 사이클 밖에서 실행되도록 한다.
function safeUnmount(root: Root) {
  setTimeout(() => {
    try {
      root.unmount();
    } catch {
      /* noop */
    }
  }, 0);
}

function makePendingEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 36px; height: 36px; border-radius: 50%;
    background: ${PENDING_COLOR}; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 800;
    border: 2px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,0.45);
    user-select: none; pointer-events: none;
  `;
  el.textContent = "+";
  return el;
}

/** 출발·도착 마커 (hilly_po CheckpointMap 과 동일 — 녹색 S / 빨강 E / S/E) */
function makeSeMarkerEl(
  bg: string,
  label: string,
  size = 28,
  textSize = 11
): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: ${size}px; height: ${size}px; border-radius: 50%;
    background: ${bg}; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: ${textSize}px; font-weight: 700; letter-spacing: 0.04em;
    border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    user-select: none; pointer-events: none;
  `;
  el.textContent = label;
  return el;
}

/** addMode prop 을 정규화 — 하위 호환: boolean true = 'point' */
function normalizeAddMode(m: boolean | AddMode | undefined): AddMode | null {
  if (!m) return null;
  if (m === true) return "point";
  return m;
}

export default function StampMap({
  points,
  bounds,
  fallbackCenter = [127.5, 36.5],
  selectedId,
  addMode,
  pendingPoint,
  radiusCircles,
  onPointDragEnd,
  start,
  end,
  onMapClick,
  onMarkerClick,
  className,
  height = 520,
}: StampMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; root: Root }>>(
    new Map()
  );
  const pendingMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const seMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const normalizedAddMode = normalizeAddMode(addMode);

  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onPointDragEndRef = useRef(onPointDragEnd);
  onPointDragEndRef.current = onPointDragEnd;
  const addModeRef = useRef<AddMode | null>(normalizedAddMode);
  addModeRef.current = normalizedAddMode;

  // 지도 초기화 — 마운트 시 한 번 (bounds 변화 시에는 fitBounds 만)
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;

    const initialCenter: [number, number] = bounds
      ? [(bounds.minLon + bounds.maxLon) / 2, (bounds.minLat + bounds.maxLat) / 2]
      : fallbackCenter;
    const initialZoom = bounds ? 11 : 6;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.on("click", (e) => {
      const mode = addModeRef.current;
      if (mode && onMapClickRef.current) {
        onMapClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }, mode);
      }
    });

    map.on("load", () => {
      applyKoreanLabels(map);
      if (bounds) {
        const fb: LngLatBoundsLike = [
          [bounds.minLon, bounds.minLat],
          [bounds.maxLon, bounds.maxLat],
        ];
        map.fitBounds(fb, { padding: 60, animate: false });
      }
    });

    return () => {
      // 마커 cleanup
      for (const [, { marker, root }] of markersRef.current) {
        marker.remove();
        safeUnmount(root);
      }
      markersRef.current.clear();
      pendingMarkerRef.current?.remove();
      pendingMarkerRef.current = null;
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      seMarkerRef.current?.remove();
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      seMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 초기 로드 시만 fitBounds (map.on("load") 안). bounds 가 포인트 추가/이동
  // 으로 바뀔 때마다 자동 줌 조정하면 운영자가 거슬려 함 — 뷰 유지 (2026-10-21).

  // 마커 동기화 — points/selectedId 변경에 반응
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const existing = markersRef.current;
      const nextIds = new Set(points.map((p) => p.id));

      // 사라진 마커 제거
      for (const [id, { marker, root }] of existing) {
        if (!nextIds.has(id)) {
          marker.remove();
          safeUnmount(root);
          existing.delete(id);
        }
      }

      // 추가/갱신
      for (const pt of points) {
        const isSel = selectedId === pt.id;
        let entry = existing.get(pt.id);
        if (!entry) {
          const el = document.createElement("div");
          el.addEventListener("click", (ev) => {
            // 드래그 끝에 발화되는 click 은 무시 (mapbox 는 dragend 뒤에도
            // click 을 발생시킬 수 있어 선택 상태가 꼬일 수 있다)
            if (
              el.dataset.dragging === "1" ||
              el.dataset.justDragged === "1"
            ) {
              el.dataset.justDragged = "";
              return;
            }
            ev.stopPropagation();
            onMarkerClickRef.current?.(pt.id);
          });
          const marker = new mapboxgl.Marker(el, { draggable: true })
            .setLngLat([pt.lng, pt.lat])
            .addTo(map);
          marker.on("dragstart", () => {
            el.dataset.dragging = "1";
            el.style.cursor = "grabbing";
          });
          marker.on("dragend", () => {
            const ll = marker.getLngLat();
            el.dataset.dragging = "";
            el.dataset.justDragged = "1";
            el.style.cursor = "";
            onPointDragEndRef.current?.(pt.id, {
              lat: ll.lat,
              lng: ll.lng,
            });
          });
          const root = createRoot(el);
          entry = { marker, root };
          existing.set(pt.id, entry);
        } else {
          // 드래그 중에는 외부에서 setLngLat 하지 말 것 (튀는 느낌 방지)
          if (entry.marker.getElement().dataset.dragging !== "1") {
            entry.marker.setLngLat([pt.lng, pt.lat]);
          }
        }
        entry.root.render(<MarkerContent point={pt} selected={isSel} />);
      }
    };

    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [points, selectedId]);

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

  // 커서 — 어느 지정 모드든 crosshair
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = normalizedAddMode ? "crosshair" : "";
    return () => {
      canvas.style.cursor = "";
    };
  }, [normalizedAddMode]);

  // 출발/도착 마커 — start/end 가 있을 때만 표시, 50m 이내면 S/E 합침
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      seMarkerRef.current?.remove();
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      seMarkerRef.current = null;

      const hasStart = start?.lat != null && start?.lng != null;
      const hasEnd = end?.lat != null && end?.lng != null;
      if (hasStart && hasEnd) {
        const isClose =
          Math.abs(start!.lng - end!.lng) < SE_CLOSE_THRESHOLD &&
          Math.abs(start!.lat - end!.lat) < SE_CLOSE_THRESHOLD;
        if (isClose) {
          const el = makeSeMarkerEl(START_COLOR, "S/E", 32, 10);
          seMarkerRef.current = new mapboxgl.Marker(el)
            .setLngLat([start!.lng, start!.lat])
            .addTo(map);
          return;
        }
      }
      if (hasStart) {
        const el = makeSeMarkerEl(START_COLOR, "S");
        startMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([start!.lng, start!.lat])
          .addTo(map);
      }
      if (hasEnd) {
        const el = makeSeMarkerEl(END_COLOR, "E");
        endMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([end!.lng, end!.lat])
          .addTo(map);
      }
    };
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [start, end]);

  // 도착 반경 원 동기화 (po 와 동일 레이어)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => syncRadiusCircles(map, radiusCircles ?? []);
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [radiusCircles]);

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
      className={
        "rounded-xl overflow-hidden border border-white/10 " +
        (className ?? "")
      }
      style={{ height, width: "100%" }}
    />
  );
}
