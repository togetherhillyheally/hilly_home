"use client";

/**
 * 보물 자리 찍기 지도 — GPX 없이 만드는 보물지도용 (2026-11-02).
 *  · 모드 "출발점": 지도를 탭하면 출발점(S)을 그 자리로 옮긴다
 *  · 모드 "보물": 지도를 탭할 때마다 보물 자리가 하나씩 늘어난다 (최대 30)
 *  · 마커는 끌어서 옮기고, 보물 마커를 누르면 지운다
 *  · 앱 획득 반경이 25m 라 60m 안에 붙은 자리는 경고만 띄운다
 */
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { applyKoreanLabels } from "@/lib/mapbox-locale";

const MAPBOX_STYLE = "mapbox://styles/mapbox/outdoors-v12";
export const MAX_TREASURE_SPOTS = 30;
export const MIN_SPOT_GAP_M = 60;

export type LatLng = { lat: number; lng: number };

export function haversineM(a: LatLng, b: LatLng) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** 서로 MIN_SPOT_GAP_M 보다 가까운 보물 쌍 (1부터 센 번호) */
export function closeSpotPairs(spots: LatLng[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < spots.length; i++)
    for (let j = i + 1; j < spots.length; j++)
      if (haversineM(spots[i], spots[j]) < MIN_SPOT_GAP_M) out.push([i + 1, j + 1]);
  return out;
}

function chestEl(n: number) {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 30px; height: 30px; border-radius: 50%; background: #F4F4F5;
    border: 2.5px solid #E8B84B; box-shadow: 0 1px 5px rgba(0,0,0,.45);
    display: flex; align-items: center; justify-content: center;
    font: 800 12px/1 Pretendard, sans-serif; color: #7A5A0E; cursor: pointer; user-select: none;`;
  el.textContent = String(n);
  el.title = `보물 ${n} — 누르면 지워요, 끌어서 옮겨요`;
  return el;
}

function startEl() {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 34px; height: 34px; border-radius: 50%; background: #2DD4BF;
    border: 3px solid #0b1f1c; box-shadow: 0 1px 6px rgba(0,0,0,.5);
    display: flex; align-items: center; justify-content: center;
    font: 900 14px/1 Pretendard, sans-serif; color: #0b1f1c; cursor: grab; user-select: none;`;
  el.textContent = "S";
  el.title = "출발점 — 끌어서 옮겨요";
  return el;
}

export default function TreasureSpotPicker({
  start,
  spots,
  onChange,
  height = 520,
  initialCenter,
  disabled,
}: {
  start: LatLng | null;
  spots: LatLng[];
  onChange: (next: { start: LatLng | null; spots: LatLng[] }) => void;
  height?: number;
  initialCenter?: LatLng;
  disabled?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mode, setMode] = useState<"start" | "treasure">(start ? "treasure" : "start");
  const [query, setQuery] = useState("");
  const [searchErr, setSearchErr] = useState<string | null>(null);

  // 클릭 핸들러가 항상 최신 값을 보도록
  const latest = useRef({ start, spots, mode, onChange, disabled });
  latest.current = { start, spots, mode, onChange, disabled };

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!boxRef.current || !token) return;
    mapboxgl.accessToken = token;
    const c = start ?? spots[0] ?? initialCenter ?? { lat: 37.5665, lng: 126.978 };
    const map = new mapboxgl.Map({
      container: boxRef.current,
      style: MAPBOX_STYLE,
      center: [c.lng, c.lat],
      zoom: start || spots.length ? 14 : 11,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.getCanvas().style.cursor = "crosshair";
    map.on("load", () => applyKoreanLabels(map));
    map.on("click", (e) => {
      const { start, spots, mode, onChange, disabled } = latest.current;
      if (disabled) return;
      const p = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (mode === "start") {
        onChange({ start: p, spots });
        setMode("treasure"); // 출발점을 찍고 나면 바로 보물 찍기로
      } else if (spots.length < MAX_TREASURE_SPOTS) {
        onChange({ start, spots: [...spots, p] });
      }
    });
    // 처음 그릴 때 찍힌 점이 다 보이게
    const pts = [...(start ? [start] : []), ...spots];
    if (pts.length > 1) {
      const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, animate: false, maxZoom: 16 }
      );
    }
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // 지도는 한 번만 만든다 — 점은 아래 effect 가 그린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 마커 동기화
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    spots.forEach((s, i) => {
      const el = chestEl(i + 1);
      const m = new mapboxgl.Marker({ element: el, draggable: !disabled }).setLngLat([s.lng, s.lat]).addTo(map);
      let dragged = false;
      m.on("dragstart", () => (dragged = true));
      m.on("dragend", () => {
        const ll = m.getLngLat();
        const { start, spots, onChange } = latest.current;
        onChange({ start, spots: spots.map((x, j) => (j === i ? { lat: ll.lat, lng: ll.lng } : x)) });
      });
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (dragged) { dragged = false; return; }
        if (latest.current.disabled) return;
        const { start, spots, onChange } = latest.current;
        onChange({ start, spots: spots.filter((_, j) => j !== i) });
      });
      markersRef.current.push(m);
    });
    if (start) {
      const el = startEl();
      const m = new mapboxgl.Marker({ element: el, draggable: !disabled }).setLngLat([start.lng, start.lat]).addTo(map);
      el.addEventListener("click", (ev) => ev.stopPropagation());
      m.on("dragend", () => {
        const ll = m.getLngLat();
        const { spots, onChange } = latest.current;
        onChange({ start: { lat: ll.lat, lng: ll.lng }, spots });
      });
      markersRef.current.push(m);
    }
  }, [start, spots, disabled]);

  // 장소 검색 (Mapbox 지오코딩) — 지도를 그곳으로 옮기기만 한다
  const search = async () => {
    const q = query.trim();
    if (!q || !token || !mapRef.current) return;
    setSearchErr(null);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&language=ko&country=kr&limit=1`;
      const res = await fetch(url);
      const data = (await res.json()) as { features?: { center: [number, number] }[] };
      const f = data.features?.[0];
      if (!f) return setSearchErr("찾지 못했어요. 다른 이름으로 검색해 보세요.");
      mapRef.current.flyTo({ center: f.center, zoom: 15 });
    } catch {
      setSearchErr("검색에 실패했어요.");
    }
  };

  if (!token) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-gray-500" style={{ height }}>
        Mapbox 토큰이 설정되지 않았어요.
      </div>
    );
  }

  const close = closeSpotPairs(spots);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
          {(
            [
              ["start", "출발점 찍기"],
              ["treasure", `보물 찍기 ${spots.length}/${MAX_TREASURE_SPOTS}`],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={disabled}
              className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors ${
                mode === m ? (m === "start" ? "bg-white text-black" : "bg-teal-400 text-[#0b1f1c]") : "text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="ml-auto flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장소 검색 (예: 광교산)"
            className="h-8 w-48 rounded-md border border-white/10 bg-black/30 px-2.5 text-xs text-gray-100 focus:border-white/30 focus:outline-none"
          />
          <button type="submit" className="h-8 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs text-gray-200 hover:bg-white/[0.08]">
            이동
          </button>
        </form>
      </div>
      {searchErr && <p className="text-[11px] text-red-300">{searchErr}</p>}

      <div ref={boxRef} className="overflow-hidden rounded-xl border border-white/10" style={{ height }} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
        <span>
          {mode === "start" ? "지도를 누르면 출발점(S)을 그 자리로 옮겨요." : "지도를 누를 때마다 보물 자리가 하나씩 늘어요."}
          {" "}마커는 끌어서 옮기고, 보물을 누르면 지워요.
        </span>
        {spots.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => confirm("보물 자리를 모두 지울까요?") && onChange({ start, spots: [] })}
            className="text-gray-400 underline-offset-2 hover:text-white hover:underline"
          >
            보물 모두 지우기
          </button>
        )}
      </div>
      {close.length > 0 && (
        <p className="text-[11px] text-amber-300">
          {close.map(([a, b]) => `${a}·${b}`).join(", ")}번 보물이 {MIN_SPOT_GAP_M}m 안에 붙어 있어요. 앱에서 25m 안에 들어오면 열리니 조금 떨어뜨리는 게 좋아요.
        </p>
      )}
    </div>
  );
}
