"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import mapboxgl, { type LngLatBoundsLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { parseStampTitle } from "@/lib/stamp-pool";
import { applyKoreanLabels } from "@/lib/mapbox-locale";
import { syncRadiusCircles, type RadiusCircle } from "./radius-layer";

const MAPBOX_STYLE = "mapbox://styles/mapbox/outdoors-v12";
const PENDING_COLOR = "#f59e0b";
const SELECTED_RING = "#ffffff";

export type StampPoint = {
  id: string;
  title: string;
  lng: number;
  lat: number;
  sort_order: number;
};

export type LatLng = { lat: number; lng: number };

export type StampMapProps = {
  points: StampPoint[];
  bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  /** 첫 마운트 시 사용할 fallback 중심 (포인트가 없는 새 지도용). 한국 중부. */
  fallbackCenter?: [number, number];
  selectedId?: string | null;
  addMode?: boolean;
  pendingPoint?: LatLng | null;
  /** 선택된 스탬프 등 도착 반경 원으로 표시할 포인트 */
  radiusCircles?: RadiusCircle[];
  /** 마커 드래그로 위치 이동 — 드래그 종료 시 호출 (lng/lat) */
  onPointDragEnd?: (pointId: string, p: LatLng) => void;
  onMapClick?: (p: LatLng) => void;
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
  const { entry, name } = parseStampTitle(point.title);
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

export default function StampMap({
  points,
  bounds,
  fallbackCenter = [127.5, 36.5],
  selectedId,
  addMode,
  pendingPoint,
  radiusCircles,
  onPointDragEnd,
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

  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onPointDragEndRef = useRef(onPointDragEnd);
  onPointDragEndRef.current = onPointDragEnd;
  const addModeRef = useRef(addMode);
  addModeRef.current = addMode;

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
      if (addModeRef.current && onMapClickRef.current) {
        onMapClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
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
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // bounds 가 바뀌면 fitBounds 재실행
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bounds) return;
    const fb: LngLatBoundsLike = [
      [bounds.minLon, bounds.minLat],
      [bounds.maxLon, bounds.maxLat],
    ];
    const apply = () => map.fitBounds(fb, { padding: 60, animate: true });
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [bounds]);

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

  // 커서
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = addMode ? "crosshair" : "";
    return () => {
      canvas.style.cursor = "";
    };
  }, [addMode]);

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
