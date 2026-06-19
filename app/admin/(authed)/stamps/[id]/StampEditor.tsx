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
} from "lucide-react";
import StampMap, { type LatLng } from "@/components/admin/StampMap";
import { parseStampTitle } from "@/lib/stamp-pool";

export type StampPointRow = {
  id: string;
  trail_id: string;
  title: string;
  hint: string | null;
  lng: number;
  lat: number;
  sort_order: number;
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
}: Props) {
  const [points, setPoints] = useState<StampPointRow[]>(initialPoints);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPoints[0]?.id ?? null
  );
  const [addMode, setAddMode] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
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

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };
  const showInfo = (msg: string) => {
    setInfo(msg);
    setTimeout(() => setInfo(null), 2500);
  };

  const onMapClick = useCallback((p: LatLng) => {
    setPending({ ...p, hint: "" });
    setAddMode(false);
  }, []);

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

  const updatePoint = (
    id: string,
    patch: Partial<Pick<StampPointRow, "title" | "hint" | "lng" | "lat">>
  ) => {
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/stamp-points/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          showError(data?.error ?? "저장 실패");
          return;
        }
        setPoints((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
        );
        showInfo("저장되었습니다.");
      } catch (e: unknown) {
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
          addMode={addMode}
          pendingPoint={pending}
          onMapClick={onMapClick}
          onMarkerClick={(id) => setSelectedId(id)}
          height={560}
        />

        {addMode && (
          <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-orange-300" />
            <span className="flex-1 text-orange-100">
              지도에서 스탬프 포인트를 찍을 위치를 클릭하세요.
            </span>
            <button
              type="button"
              onClick={() => setAddMode(false)}
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
              setAddMode((v) => !v);
              setPending(null);
            }}
            disabled={saving || !!pending}
            className={`w-full h-10 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
              addMode
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
                const { entry, name } = parseStampTitle(p.title);
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
  onSave: (patch: { title?: string; hint?: string | null; lat?: number; lng?: number }) => void;
  onDelete: () => void;
};

function PointDetail({ point, saving, onSave, onDelete }: DetailProps) {
  const { entry, name: initialName } = parseStampTitle(point.title);
  const [name, setName] = useState(initialName);
  const [hint, setHint] = useState(point.hint ?? "");
  const [lat, setLat] = useState(String(point.lat));
  const [lng, setLng] = useState(String(point.lng));

  const initialTitleName = initialName;
  const dirty =
    name !== initialTitleName ||
    hint !== (point.hint ?? "") ||
    Number(lat) !== point.lat ||
    Number(lng) !== point.lng;

  const save = () => {
    const patch: Parameters<typeof onSave>[0] = {};
    if (name !== initialTitleName) {
      // title 은 "icon|name" 포맷 유지 (entry 가 있으면 그대로 사용)
      patch.title = entry ? `${entry.icon}|${name.trim() || entry.name}` : name.trim();
    }
    if (hint !== (point.hint ?? "")) patch.hint = hint || null;
    const latN = Number(lat);
    const lngN = Number(lng);
    if (Number.isFinite(latN) && latN !== point.lat) patch.lat = latN;
    if (Number.isFinite(lngN) && lngN !== point.lng) patch.lng = lngN;
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
          {entry?.name ?? initialName ?? `${point.sort_order}번째 스탬프`}
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
