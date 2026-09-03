"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type LngLat = [number, number];

export type ParticipantTrack = {
  userId: string;
  nickname: string | null;
  segments: LngLat[][];
};

// 여러 참가자 색상 팔레트 (오렌지 → 핑크 → 시안 → 그린 순환)
const TRACK_COLORS = [
  "#fb923c",
  "#ec4899",
  "#22d3ee",
  "#84cc16",
  "#a78bfa",
  "#facc15",
  "#f43f5e",
  "#38bdf8",
];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * 세션 참가자별 GPS 경로를 Mapbox 지도에 폴리라인으로 오버레이.
 * 참가자마다 색으로 구분. 좌표 자동 fit.
 */
export default function SessionRouteMap({
  tracks,
}: {
  tracks: ParticipantTrack[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.warn("[SessionRouteMap] NEXT_PUBLIC_MAPBOX_TOKEN 없음");
      return;
    }
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // 최초 중심 — 첫 트랙의 첫 좌표. 없으면 서울시청 (기본)
    const firstPoint = tracks[0]?.segments[0]?.[0] ?? [126.978, 37.5665];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: firstPoint,
      zoom: 13,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      // 모든 좌표 수집해서 bounds 계산
      const allPoints: LngLat[] = tracks.flatMap((t) => t.segments.flat());

      tracks.forEach((t, i) => {
        if (t.segments.length === 0) return;
        const color = TRACK_COLORS[i % TRACK_COLORS.length];
        const sourceId = `track-${t.userId}`;
        const layerId = `track-${t.userId}-line`;

        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: t.segments
              .filter((seg) => seg.length >= 2)
              .map((seg) => ({
                type: "Feature",
                geometry: { type: "LineString", coordinates: seg },
                properties: {},
              })),
          },
        });
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": color,
            "line-width": 4,
            "line-opacity": 0.85,
          },
        });

        // 시작·끝 마커
        const first = t.segments[0]?.[0];
        const last = t.segments[t.segments.length - 1]?.slice(-1)[0];
        if (first) {
          new mapboxgl.Marker({ color, scale: 0.7 })
            .setLngLat(first)
            .setPopup(
              new mapboxgl.Popup({ offset: 12 }).setText(
                `${t.nickname ?? "익명"} · 시작`
              )
            )
            .addTo(map);
        }
        if (last && last !== first) {
          new mapboxgl.Marker({ color, scale: 0.9 })
            .setLngLat(last)
            .setPopup(
              new mapboxgl.Popup({ offset: 12 }).setText(
                `${t.nickname ?? "익명"} · 종료`
              )
            )
            .addTo(map);
        }
      });

      if (allPoints.length >= 2) {
        const bounds = allPoints.reduce(
          (b, p) => b.extend(p),
          new mapboxgl.LngLatBounds(allPoints[0], allPoints[0])
        );
        map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 16 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [tracks]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-xs text-gray-500">
        지도 토큰이 설정되지 않았어요.
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-xs text-gray-500">
        기록된 GPS 경로가 없어요.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-[380px] lg:h-[460px]"
        aria-label="세션 경로 지도"
      />
      {tracks.length > 1 ? (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-white/5 bg-white/[0.02]">
          {tracks.map((t, i) => (
            <div key={t.userId} className="flex items-center gap-1.5 text-[11px]">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: TRACK_COLORS[i % TRACK_COLORS.length] }}
              />
              <span className="text-gray-300">{t.nickname ?? "익명"}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
