"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Flag,
  RotateCcw,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import TrailMapPreview, {
  type LatLng,
} from "@/components/admin/TrailMapPreview";

type Coord = [number, number] | [number, number, number];
type Coordinates = Coord[] | Coord[][];

type Props = {
  trailId: string;
  coordinates: Coordinates;
  bounds:
    | { minLat: number; maxLat: number; minLon: number; maxLon: number }
    | null;
  initialStart: LatLng | null;
  initialEnd: LatLng | null;
};

type EditMode = "start" | "end" | null;

function fmt(n: number): string {
  return n.toFixed(5);
}

export default function StartEndEditor({
  trailId,
  coordinates,
  bounds,
  initialStart,
  initialEnd,
}: Props) {
  const router = useRouter();
  const [start, setStart] = useState<LatLng | null>(initialStart);
  const [end, setEnd] = useState<LatLng | null>(initialEnd);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [pending, setPending] = useState<LatLng | null>(null);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const beginEdit = (which: "start" | "end") => {
    setError(null);
    setEditMode(which);
    setPending(null);
  };

  const cancelEdit = () => {
    setEditMode(null);
    setPending(null);
  };

  const onMapClick = (p: LatLng) => {
    if (!editMode) return;
    setPending(p);
  };

  const confirm = () => {
    if (!editMode || !pending) return;
    const which = editMode;
    const point = pending;
    setError(null);

    const body =
      which === "start"
        ? { start_lat: point.lat, start_lng: point.lng }
        : { end_lat: point.lat, end_lng: point.lng };

    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "저장 실패");
          return;
        }
        if (which === "start") setStart(point);
        else setEnd(point);
        setEditMode(null);
        setPending(null);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  };

  const resetToAuto = (which: "start" | "end") => {
    setError(null);
    const body =
      which === "start"
        ? { start_lat: null, start_lng: null }
        : { end_lat: null, end_lng: null };

    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "리셋 실패");
          return;
        }
        if (which === "start") setStart(null);
        else setEnd(null);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "리셋 실패");
      }
    });
  };

  return (
    <div className="space-y-4">
      <TrailMapPreview
        coordinates={coordinates}
        bounds={bounds ?? undefined}
        start={start}
        end={end}
        editMode={editMode}
        pendingPoint={pending}
        onMapClick={onMapClick}
        height={460}
      />

      {/* 편집 안내 바 */}
      {editMode && (
        <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 flex items-center gap-3 text-sm">
          <MapPin className="h-4 w-4 text-orange-300 flex-shrink-0" />
          <div className="flex-1">
            {pending ? (
              <span className="text-white">
                선택한 위치: 위도 {fmt(pending.lat)}, 경도 {fmt(pending.lng)}
              </span>
            ) : (
              <span className="text-orange-100">
                지도에서{" "}
                <strong>{editMode === "start" ? "시작" : "끝"} 지점</strong>으로
                지정할 위치를 클릭하세요.
              </span>
            )}
          </div>
          {pending && (
            <button
              type="button"
              onClick={confirm}
              disabled={saving}
              className="px-3 h-8 rounded-md bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              이 위치로 지정
            </button>
          )}
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="px-3 h-8 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs inline-flex items-center gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            취소
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 시작/끝 컨트롤 — 편집 모드 아닐 때만 노출 */}
      {!editMode && (
        <div className="grid sm:grid-cols-2 gap-3">
          {/* 시작점 */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                S
              </span>
              <span className="text-sm font-medium text-white">시작점</span>
            </div>
            <div className="text-xs text-gray-400 mb-3">
              {start ? (
                <span className="font-mono">
                  {fmt(start.lat)}, {fmt(start.lng)}
                </span>
              ) : (
                <span className="text-gray-500">
                  자동 (GPX 첫 좌표)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => beginEdit("start")}
                className="flex-1 h-8 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs inline-flex items-center justify-center gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" />
                위치 변경
              </button>
              {start && (
                <button
                  type="button"
                  onClick={() => resetToAuto("start")}
                  disabled={saving}
                  className="h-8 px-2.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs inline-flex items-center gap-1.5"
                  title="자동(GPX 첫 좌표)으로 되돌리기"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 끝점 */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
                <Flag className="h-3 w-3" />
              </span>
              <span className="text-sm font-medium text-white">끝점</span>
            </div>
            <div className="text-xs text-gray-400 mb-3">
              {end ? (
                <span className="font-mono">
                  {fmt(end.lat)}, {fmt(end.lng)}
                </span>
              ) : (
                <span className="text-gray-500">
                  자동 (GPX 마지막 좌표)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => beginEdit("end")}
                className="flex-1 h-8 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs inline-flex items-center justify-center gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" />
                위치 변경
              </button>
              {end && (
                <button
                  type="button"
                  onClick={() => resetToAuto("end")}
                  disabled={saving}
                  className="h-8 px-2.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs inline-flex items-center gap-1.5"
                  title="자동(GPX 마지막 좌표)으로 되돌리기"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
