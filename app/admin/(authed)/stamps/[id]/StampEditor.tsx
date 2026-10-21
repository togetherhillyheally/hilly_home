"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  MapPin,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  Save,
  Flag,
  CircleDot,
} from "lucide-react";
import StampMap, {
  type AddMode,
  type LatLng,
} from "@/components/admin/StampMap";
import type { RadiusCircle } from "@/components/admin/radius-layer";
import {
  SCORE_TIERS,
  TIER_COLOR,
  composeStampTitle,
  parseStampTitle,
  type ScoreTier,
} from "@/lib/stamp-pool";

/** StampGuide/앱과 동일 — 반경 미지정 시 기본 25m */
const DEFAULT_STAMP_RADIUS_M = 25;
import QuizEditor, {
  emptyQuiz,
  isQuizComplete,
  type QuizDraft,
  type QuizEditorValue,
} from "@/components/admin/QuizEditor";

export type StampPointRow = {
  id: string;
  trail_id: string;
  title: string;
  hint: string | null;
  lng: number;
  lat: number;
  sort_order: number;
  radius_m: number | null;
  quiz_question: string | null;
  quiz_choices: string[] | null;
  quiz_answer_index: number | null;
};

type PointPatch = {
  title?: string;
  hint?: string | null;
  lat?: number;
  lng?: number;
  radius_m?: number | null;
  quiz_question?: string | null;
  quiz_choices?: string[] | null;
  quiz_answer_index?: number | null;
};

type Props = {
  trailId: string;
  initialPoints: StampPointRow[];
  initialBounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } | null;
  initialStart?: LatLng | null;
  initialEnd?: LatLng | null;
};

type Pending = LatLng & { hint: string };

function computeBounds(
  points: StampPointRow[]
): { minLat: number; maxLat: number; minLon: number; maxLon: number } | null {
  if (points.length === 0) return null;
  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLon) minLon = p.lng;
    if (p.lng > maxLon) maxLon = p.lng;
  }
  return { minLat, maxLat, minLon, maxLon };
}

export default function StampEditor({
  trailId,
  initialPoints,
  initialBounds,
  initialStart = null,
  initialEnd = null,
}: Props) {
  const [points, setPoints] = useState<StampPointRow[]>(initialPoints);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPoints[0]?.id ?? null
  );
  // addMode: null | 'point' (스탬프 추가) | 'start' | 'end' (출발·도착 지정)
  const [addMode, setAddMode] = useState<AddMode | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [start, setStart] = useState<LatLng | null>(initialStart);
  const [end, setEnd] = useState<LatLng | null>(initialEnd);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const bounds = useMemo(
    () => computeBounds(points) ?? initialBounds,
    [points, initialBounds]
  );

  const selected = useMemo(
    () => points.find((p) => p.id === selectedId) ?? null,
    [points, selectedId]
  );

  // po 와 동일 — 선택된 스탬프의 도착 반경 원만 지도에 표시
  const radiusCircles = useMemo<RadiusCircle[]>(() => {
    if (!selected) return [];
    return [
      {
        id: selected.id,
        lng: selected.lng,
        lat: selected.lat,
        radiusM: selected.radius_m ?? DEFAULT_STAMP_RADIUS_M,
      },
    ];
  }, [selected]);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };
  const showInfo = (msg: string) => {
    setInfo(msg);
    setTimeout(() => setInfo(null), 2500);
  };

  // 지도 click 시: 모드별로 분기 (스탬프 추가 / 출발·도착 지정)
  const onMapClick = useCallback(
    (p: LatLng, mode: AddMode) => {
      if (mode === "start") {
        patchTrailStartEnd({ start_lat: p.lat, start_lng: p.lng }, "start");
        setStart(p);
        setAddMode(null);
      } else if (mode === "end") {
        patchTrailStartEnd({ end_lat: p.lat, end_lng: p.lng }, "end");
        setEnd(p);
        setAddMode(null);
      } else {
        setPending({ ...p, hint: "" });
        setAddMode(null);
      }
    },
    // patchTrailStartEnd 는 아래에서 선언 — 참조만 하므로 ESLint 순환 경고 억제
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const patchTrailStartEnd = (
    patch: Record<string, number | null>,
    kind: "start" | "end"
  ) => {
    // 낙관적 반영은 호출자가 이미 setStart/setEnd 했음. 롤백 스냅샷만 보관.
    const snapStart = start;
    const snapEnd = end;
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          // 롤백
          if (kind === "start") setStart(snapStart);
          else setEnd(snapEnd);
          showError(d?.error ?? "저장 실패");
          return;
        }
        showInfo(kind === "start" ? "출발점 저장됨" : "도착점 저장됨");
      } catch (e) {
        if (kind === "start") setStart(snapStart);
        else setEnd(snapEnd);
        showError(e instanceof Error ? e.message : "네트워크 오류");
      }
    });
  };

  const clearStartEnd = (kind: "start" | "end") => {
    const confirmMsg =
      kind === "start" ? "출발점을 지울까요?" : "도착점을 지울까요?";
    if (!confirm(confirmMsg)) return;
    const snapStart = start;
    const snapEnd = end;
    if (kind === "start") setStart(null);
    else setEnd(null);
    startSave(async () => {
      try {
        const patch =
          kind === "start"
            ? { start_lat: null, start_lng: null }
            : { end_lat: null, end_lng: null };
        const res = await fetch(`/api/admin/trails/${trailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          if (kind === "start") setStart(snapStart);
          else setEnd(snapEnd);
          showError("저장 실패");
          return;
        }
        showInfo(kind === "start" ? "출발점 해제" : "도착점 해제");
      } catch {
        if (kind === "start") setStart(snapStart);
        else setEnd(snapEnd);
        showError("네트워크 오류");
      }
    });
  };

  const cancelPending = () => setPending(null);

  const savePending = () => {
    if (!pending) return;
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}/stamp-points`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lng: pending.lng,
            lat: pending.lat,
            hint: pending.hint.trim() || null,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          showError(data?.error ?? "등록 실패");
          return;
        }
        const row = data.row as StampPointRow;
        setPoints((prev) =>
          [...prev, row].sort((a, b) => a.sort_order - b.sort_order)
        );
        setSelectedId(row.id);
        setPending(null);
        showInfo("스탬프가 추가되었습니다.");
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "등록 실패");
      }
    });
  };

  const updatePoint = (id: string, patch: PointPatch) => {
    // 낙관적 반영 — UI(지도·리스트) 를 호출 즉시 갱신. 서버 응답 실패 시 롤백.
    const prevSnapshot = points.find((p) => p.id === id);
    setPoints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/stamp-points/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          // 롤백
          if (prevSnapshot) {
            setPoints((prev) =>
              prev.map((p) => (p.id === id ? prevSnapshot : p))
            );
          }
          showError(data?.error ?? "저장 실패");
          return;
        }
        showInfo("저장되었습니다.");
      } catch (e: unknown) {
        if (prevSnapshot) {
          setPoints((prev) =>
            prev.map((p) => (p.id === id ? prevSnapshot : p))
          );
        }
        showError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  };

  const deletePoint = (id: string) => {
    if (!confirm("이 스탬프 포인트를 삭제할까요?")) return;
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/stamp-points/${id}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          showError(data?.error ?? "삭제 실패");
          return;
        }
        setPoints((prev) => prev.filter((p) => p.id !== id));
        if (selectedId === id) setSelectedId(null);
        showInfo("삭제되었습니다.");
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "삭제 실패");
      }
    });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-6">
      {/* 좌측: 지도 + 알림 */}
      <div className="space-y-4">
        <StampMap
          points={points}
          bounds={bounds ?? undefined}
          selectedId={selectedId}
          addMode={addMode ?? false}
          pendingPoint={pending}
          radiusCircles={radiusCircles}
          start={start}
          end={end}
          onMapClick={onMapClick}
          onMarkerClick={(id) => setSelectedId(id)}
          onPointDragEnd={(id, p) => {
            // 지도 튐 방지 — updatePoint 내부에서 낙관적 setPoints 가 돌지만
            // drag end 시점에선 외부 setPoints 로 명시 한 번 더 (안전).
            setPoints((prev) =>
              prev.map((pt) => (pt.id === id ? { ...pt, lat: p.lat, lng: p.lng } : pt))
            );
            updatePoint(id, { lat: p.lat, lng: p.lng });
          }}
          onStartDragEnd={(p) => {
            setStart(p);
            patchTrailStartEnd(
              { start_lat: p.lat, start_lng: p.lng },
              "start"
            );
          }}
          onEndDragEnd={(p) => {
            setEnd(p);
            patchTrailStartEnd({ end_lat: p.lat, end_lng: p.lng }, "end");
          }}
          height={560}
        />

        {addMode && (
          <div
            className={`rounded-lg border px-4 py-3 flex items-center gap-3 text-sm ${
              addMode === "start"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : addMode === "end"
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-orange-500/40 bg-orange-500/10"
            }`}
          >
            {addMode === "start" ? (
              <CircleDot className="h-4 w-4 text-emerald-300" />
            ) : addMode === "end" ? (
              <Flag className="h-4 w-4 text-rose-300" />
            ) : (
              <MapPin className="h-4 w-4 text-orange-300" />
            )}
            <span
              className={`flex-1 ${
                addMode === "start"
                  ? "text-emerald-100"
                  : addMode === "end"
                    ? "text-rose-100"
                    : "text-orange-100"
              }`}
            >
              {addMode === "start"
                ? "지도에서 출발점(S) 위치를 클릭하세요."
                : addMode === "end"
                  ? "지도에서 도착점(E) 위치를 클릭하세요."
                  : "지도에서 스탬프 포인트를 찍을 위치를 클릭하세요."}
            </span>
            <button
              type="button"
              onClick={() => setAddMode(null)}
              className="px-3 h-8 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs inline-flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              취소
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{info}</span>
          </div>
        )}
      </div>

      {/* 우측: 컨트롤 + pending + 목록 + 상세 */}
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            스탬프 추가
          </h3>
          <button
            type="button"
            onClick={() => {
              setAddMode((v) => (v === "point" ? null : "point"));
              setPending(null);
            }}
            disabled={saving || !!pending}
            className={`w-full h-10 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
              addMode === "point"
                ? "bg-orange-500 text-white"
                : "bg-white/[0.06] hover:bg-white/[0.12] text-white"
            }`}
          >
            <Plus className="h-4 w-4" />
            지도에서 클릭으로 추가
          </button>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            클릭하면 자동으로 STAMP_POOL의 아이콘(잎·꽃·별 등)이 할당돼요.
            제목·아이콘은 등록 후 변경 가능합니다.
          </p>
        </div>

        {/* 출발/도착 지점 지정 — trails.start_lat/lng, end_lat/lng 에 저장 */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            출발 · 도착
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {/* 출발 */}
            <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs">
                <CircleDot className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-semibold text-white">출발 (S)</span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono min-h-[14px]">
                {start
                  ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}`
                  : "미지정"}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setAddMode((v) => (v === "start" ? null : "start"));
                    setPending(null);
                  }}
                  disabled={saving}
                  className={`flex-1 h-8 rounded-md text-[11px] font-medium ${
                    addMode === "start"
                      ? "bg-emerald-500 text-white"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-white"
                  }`}
                >
                  {addMode === "start" ? "취소" : start ? "변경" : "지정"}
                </button>
                {start && (
                  <button
                    type="button"
                    onClick={() => clearStartEnd("start")}
                    disabled={saving}
                    className="h-8 w-8 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-200 inline-flex items-center justify-center"
                    title="출발점 해제"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {/* 도착 */}
            <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Flag className="h-3.5 w-3.5 text-rose-400" />
                <span className="font-semibold text-white">도착 (E)</span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono min-h-[14px]">
                {end
                  ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}`
                  : "미지정"}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setAddMode((v) => (v === "end" ? null : "end"));
                    setPending(null);
                  }}
                  disabled={saving}
                  className={`flex-1 h-8 rounded-md text-[11px] font-medium ${
                    addMode === "end"
                      ? "bg-rose-500 text-white"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-white"
                  }`}
                >
                  {addMode === "end" ? "취소" : end ? "변경" : "지정"}
                </button>
                {end && (
                  <button
                    type="button"
                    onClick={() => clearStartEnd("end")}
                    disabled={saving}
                    className="h-8 w-8 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-200 inline-flex items-center justify-center"
                    title="도착점 해제"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            지도에서 "지정"을 눌러 클릭. 출발·도착이 50m 이내로 가까우면
            지도에 "S/E" 한 마커로 합쳐져요 (순환 코스).
          </p>
        </div>

        {pending && (
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/[0.06] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Plus className="h-4 w-4 text-orange-300" />새 스탬프 포인트
            </div>
            <div className="text-[11px] text-gray-400 font-mono">
              {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}
            </div>
            <textarea
              value={pending.hint}
              onChange={(e) => setPending({ ...pending, hint: e.target.value })}
              placeholder="힌트 (선택, 참가자에게 노출됨)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelPending}
                disabled={saving}
                className="flex-1 h-9 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs"
              >
                취소
              </button>
              <button
                type="button"
                onClick={savePending}
                disabled={saving}
                className="flex-1 h-9 rounded-md bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                등록
              </button>
            </div>
          </div>
        )}

        {/* 목록 */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              포인트 목록
            </h3>
            <span className="text-[11px] text-gray-500 font-mono">
              {points.length}개
            </span>
          </div>
          {points.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-gray-500">
              지도에서 클릭하여 첫 스탬프 포인트를 추가하세요.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
              {points.map((p) => {
                const isSel = selectedId === p.id;
                const { entry, name, score } = parseStampTitle(p.title);
                const Icon = entry?.Icon;
                const color = entry?.color ?? "#fb923c";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                      isSel
                        ? "bg-orange-500/10 border-l-2 border-orange-500"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {score != null ? (
                      <span
                        className="w-7 h-7 rounded-full border-2 flex items-center justify-center tabular-nums"
                        style={{
                          background: TIER_COLOR[score],
                          borderColor: "#fff",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        {score}
                      </span>
                    ) : (
                      <span
                        className="w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white"
                        style={{ borderColor: color }}
                      >
                        {Icon ? (
                          <Icon width={14} height={14} color={color} />
                        ) : (
                          <span
                            className="text-xs font-bold"
                            style={{ color }}
                          >
                            {p.sort_order}
                          </span>
                        )}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {name || `${p.sort_order}번째 스탬프`}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      #{p.sort_order}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 선택된 포인트 상세 */}
        {selected && (
          <PointDetail
            key={selected.id}
            point={selected}
            saving={saving}
            onSave={(patch) => updatePoint(selected.id, patch)}
            onDelete={() => deletePoint(selected.id)}
            onError={showError}
          />
        )}
      </div>
    </div>
  );
}

// === 선택된 포인트 상세 ===
type DetailProps = {
  point: StampPointRow;
  saving: boolean;
  onSave: (patch: PointPatch) => void;
  onDelete: () => void;
  onError: (msg: string) => void;
};

function initialQuizValue(point: StampPointRow): QuizEditorValue {
  const q: QuizDraft | null =
    point.quiz_question && point.quiz_choices && point.quiz_answer_index != null
      ? {
          question: point.quiz_question,
          choices: [...point.quiz_choices],
          answerIndex: point.quiz_answer_index,
        }
      : null;
  return { quiz: q, radiusM: point.radius_m };
}

function quizPatchIfChanged(
  point: StampPointRow,
  next: QuizEditorValue
): { patch: PointPatch; error: string | null } {
  const patch: PointPatch = {};
  let error: string | null = null;

  // radius
  if ((next.radiusM ?? null) !== (point.radius_m ?? null)) {
    patch.radius_m = next.radiusM ?? null;
  }

  // quiz — all-or-none
  const wasOn =
    point.quiz_question != null &&
    point.quiz_choices != null &&
    point.quiz_answer_index != null;
  const isOn = next.quiz != null;

  if (!isOn && wasOn) {
    patch.quiz_question = null;
    patch.quiz_choices = null;
    patch.quiz_answer_index = null;
  } else if (isOn && next.quiz) {
    if (!isQuizComplete(next.quiz)) {
      error = "퀴즈 질문과 모든 선택지를 채워주세요.";
    } else {
      const changed =
        !wasOn ||
        next.quiz.question.trim() !== point.quiz_question ||
        next.quiz.answerIndex !== point.quiz_answer_index ||
        JSON.stringify(next.quiz.choices.map((c) => c.trim())) !==
          JSON.stringify(point.quiz_choices);
      if (changed) {
        patch.quiz_question = next.quiz.question.trim();
        patch.quiz_choices = next.quiz.choices.map((c) => c.trim());
        patch.quiz_answer_index = next.quiz.answerIndex;
      }
    }
  }
  return { patch, error };
}

function PointDetail({ point, saving, onSave, onDelete, onError }: DetailProps) {
  // 매 렌더마다 point 기준으로 유도 — 저장 후 point prop 이 바뀌면 자연 동기화
  const parsed = parseStampTitle(point.title);
  const { entry } = parsed;
  const currentName = parsed.name;
  const currentScore = parsed.score;

  const [name, setName] = useState(currentName);
  const [score, setScore] = useState<ScoreTier | null>(currentScore);
  const [hint, setHint] = useState(point.hint ?? "");
  const [lat, setLat] = useState(String(point.lat));
  const [lng, setLng] = useState(String(point.lng));
  const [quizValue, setQuizValue] = useState<QuizEditorValue>(() =>
    initialQuizValue(point)
  );

  const baselineQuiz = useMemo(() => initialQuizValue(point), [point]);
  const quizDirty =
    JSON.stringify(quizValue) !== JSON.stringify(baselineQuiz);
  // dirty 비교는 "현재 point(서버 저장된 값)" 기준 — 저장 후 자동으로 false
  const dirty =
    name !== currentName ||
    score !== currentScore ||
    hint !== (point.hint ?? "") ||
    Number(lat) !== point.lat ||
    Number(lng) !== point.lng ||
    quizDirty;

  // 배점은 다른 필드와 다르게 "즉시 저장" — 드래그 이동과 동일 패턴.
  // 이름은 저장되지 않은 변경일 수 있으므로 서버에 저장된 currentName 을 사용.
  const changeScore = (next: ScoreTier | null) => {
    setScore(next);
    const nextTitle = composeStampTitle(entry, currentName, next);
    if (nextTitle !== point.title) onSave({ title: nextTitle });
  };

  const save = () => {
    const patch: PointPatch = {};
    if (name !== currentName || score !== currentScore) {
      // title = "icon|name(score)" — PO 이벤트 지도가 끝의 "(N)" 을 점수로 파싱
      patch.title = composeStampTitle(entry, name, score);
    }
    if (hint !== (point.hint ?? "")) patch.hint = hint || null;
    const latN = Number(lat);
    const lngN = Number(lng);
    if (Number.isFinite(latN) && latN !== point.lat) patch.lat = latN;
    if (Number.isFinite(lngN) && lngN !== point.lng) patch.lng = lngN;

    const { patch: qPatch, error: qErr } = quizPatchIfChanged(point, quizValue);
    if (qErr) {
      onError(qErr);
      return;
    }
    Object.assign(patch, qPatch);
    if (Object.keys(patch).length === 0) return;
    onSave(patch);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white"
          style={{ borderColor: entry?.color ?? "#fb923c" }}
        >
          {entry?.Icon ? (
            <entry.Icon
              width={14}
              height={14}
              color={entry.color}
            />
          ) : (
            <span className="text-xs font-bold text-orange-400">
              {point.sort_order}
            </span>
          )}
        </span>
        <h3 className="text-sm font-medium text-white truncate flex-1">
          {entry?.name ?? currentName ?? `${point.sort_order}번째 스탬프`}
          {entry && (
            <span className="ml-2 text-[10px] text-gray-500 font-mono">
              {entry.icon}
            </span>
          )}
        </h3>
      </div>

      <div>
        <label className="block text-[10px] text-gray-500 mb-1">표시 이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={entry?.name ?? "이름"}
          className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
        />
        {entry && (
          <p className="text-[10px] text-gray-500 mt-1">
            아이콘은 {entry.icon} 으로 고정. 이름만 바꿀 수 있어요.
          </p>
        )}
      </div>

      <div>
        <label className="block text-[10px] text-gray-500 mb-1">
          배점 (낯선곳으로 이벤트 코스 지도 전용 · 선택)
        </label>
        <div className="grid grid-cols-6 gap-1.5">
          <button
            type="button"
            onClick={() => changeScore(null)}
            disabled={saving}
            className={`h-9 rounded-md text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
              score == null
                ? "bg-white/[0.08] border-white/30 text-white"
                : "bg-white/[0.02] border-white/10 text-gray-500 hover:text-white"
            }`}
          >
            없음
          </button>
          {SCORE_TIERS.map((n) => {
            const selected = score === n;
            const c = TIER_COLOR[n];
            return (
              <button
                key={n}
                type="button"
                onClick={() => changeScore(n)}
                disabled={saving}
                style={{
                  background: selected ? c : "transparent",
                  borderColor: selected ? "#fff" : c,
                  color: selected ? "#fff" : c,
                }}
                className="h-9 rounded-md text-[11px] font-bold border-2 tabular-nums transition-colors disabled:opacity-50"
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
          누르면 바로 저장돼요 — 지도 마커가 점선 테두리 + 숫자 + 색상(10
          세이지~50 크림슨) 으로 즉시 바뀜. "낯선곳으로 — 광교산" 처럼 배점
          체크포인트 지도에 사용.
        </p>
      </div>

      <div>
        <label className="block text-[10px] text-gray-500 mb-1">힌트</label>
        <textarea
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          rows={2}
          placeholder="참가자에게 노출되는 힌트"
          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">위도</label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full h-9 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-orange-500/50"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">경도</label>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full h-9 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-orange-500/50"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-white/10">
        <QuizEditor
          value={quizValue}
          onChange={setQuizValue}
          disabled={saving}
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty}
        className="w-full h-9 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-white/[0.06] disabled:text-gray-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        변경사항 저장
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={saving}
        className="w-full h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-200 text-xs inline-flex items-center justify-center gap-2"
      >
        <Trash2 className="h-3.5 w-3.5" />
        이 포인트 삭제
      </button>
    </div>
  );
}
