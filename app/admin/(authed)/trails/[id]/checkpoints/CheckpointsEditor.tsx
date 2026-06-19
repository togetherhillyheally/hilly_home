"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  MapPin,
  Image as ImageIcon,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  Save,
  ImagePlus,
} from "lucide-react";
import exifr from "exifr";
import CheckpointMap, {
  type Checkpoint,
  type LatLng,
} from "@/components/admin/CheckpointMap";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

type Coord = [number, number] | [number, number, number];
type Coordinates = Coord[] | Coord[][];

export type CheckpointRow = {
  id: string;
  trail_id: string;
  sort_order: number;
  title: string;
  lng: number;
  lat: number;
  note: string | null;
  marker_icon: string | null;
};

export type PhotoRow = {
  id: string;
  checkpoint_id: string;
  storage_bucket: string;
  storage_path: string;
  sort_order: number;
  file_size_bytes: number | null;
  taken_at: string | null;
};

type Props = {
  trailId: string;
  coordinates: Coordinates;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } | null;
  initialCheckpoints: CheckpointRow[];
  initialPhotos: Record<string, PhotoRow[]>;
};

type PendingMapClick = LatLng & { title: string; note: string };
type PendingPhoto = {
  file: File;
  preview: string;
  lat: number | null;
  lng: number | null;
  takenAt: string | null;
  title: string;
  note: string;
};

function photoPublicUrl(bucket: string, path: string): string {
  if (!SUPABASE_URL) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

async function extractExif(file: File): Promise<{
  lat: number | null;
  lng: number | null;
  takenAt: string | null;
}> {
  try {
    const data = await exifr.parse(file, {
      gps: true,
      pick: ["DateTimeOriginal", "CreateDate"],
    });
    if (!data) return { lat: null, lng: null, takenAt: null };
    const lat =
      typeof data.latitude === "number" && Number.isFinite(data.latitude)
        ? data.latitude
        : null;
    const lng =
      typeof data.longitude === "number" && Number.isFinite(data.longitude)
        ? data.longitude
        : null;
    const dt = data.DateTimeOriginal ?? data.CreateDate ?? null;
    const takenAt =
      dt instanceof Date ? dt.toISOString() : typeof dt === "string" ? dt : null;
    return { lat, lng, takenAt };
  } catch {
    return { lat: null, lng: null, takenAt: null };
  }
}

export default function CheckpointsEditor({
  trailId,
  coordinates,
  bounds,
  initialCheckpoints,
  initialPhotos,
}: Props) {
  const [cps, setCps] = useState<CheckpointRow[]>(initialCheckpoints);
  const [photosByCp, setPhotosByCp] = useState<Record<string, PhotoRow[]>>(
    initialPhotos
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCheckpoints[0]?.id ?? null
  );
  const [addMode, setAddMode] = useState(false);
  const [pendingMapClick, setPendingMapClick] = useState<PendingMapClick | null>(
    null
  );
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const checkpointsForMap: Checkpoint[] = useMemo(
    () => cps.map((c) => ({ id: c.id, lng: c.lng, lat: c.lat, title: c.title, sort_order: c.sort_order })),
    [cps]
  );

  const selected = useMemo(
    () => cps.find((c) => c.id === selectedId) ?? null,
    [cps, selectedId]
  );

  // 선택된 체크포인트의 사진 lazy fetch
  useEffect(() => {
    if (!selectedId) return;
    if (photosByCp[selectedId]) return;
    let cancelled = false;
    fetch(`/api/admin/checkpoints/${selectedId}/photos`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const rows = (d?.rows ?? []) as PhotoRow[];
        setPhotosByCp((prev) => ({ ...prev, [selectedId]: rows }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedId, photosByCp]);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };
  const showInfo = (msg: string) => {
    setInfo(msg);
    setTimeout(() => setInfo(null), 3000);
  };

  // === 지도 클릭 모드 ===
  const onMapClick = useCallback((p: LatLng) => {
    if (!addMode) return;
    setPendingMapClick({ ...p, title: "", note: "" });
    setAddMode(false);
  }, [addMode]);

  const saveMapClickCheckpoint = () => {
    if (!pendingMapClick) return;
    startSave(async () => {
      try {
        const res = await fetch(
          `/api/admin/trails/${trailId}/checkpoints`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lng: pendingMapClick.lng,
              lat: pendingMapClick.lat,
              title: pendingMapClick.title.trim() || undefined,
              note: pendingMapClick.note.trim() || null,
            }),
          }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          showError(data?.error ?? "등록 실패");
          return;
        }
        const row = data.row as CheckpointRow;
        setCps((prev) =>
          [...prev, row].sort((a, b) => a.sort_order - b.sort_order)
        );
        setSelectedId(row.id);
        setPendingMapClick(null);
        showInfo("체크포인트가 추가되었습니다.");
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "등록 실패");
      }
    });
  };

  // === 사진으로 추가 ===
  const onSelectPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    const preview = URL.createObjectURL(file);
    const exif = await extractExif(file);
    setPendingPhoto({
      file,
      preview,
      lat: exif.lat,
      lng: exif.lng,
      takenAt: exif.takenAt,
      title: "",
      note: "",
    });
  };

  const savePhotoCheckpoint = () => {
    if (!pendingPhoto) return;
    if (pendingPhoto.lat == null || pendingPhoto.lng == null) {
      showError("위도/경도를 입력해주세요. 사진에 GPS 정보가 없는 경우 수동 입력이 필요해요.");
      return;
    }
    startSave(async () => {
      try {
        // 1) 체크포인트 생성
        const r1 = await fetch(
          `/api/admin/trails/${trailId}/checkpoints`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lng: pendingPhoto.lng,
              lat: pendingPhoto.lat,
              title: pendingPhoto.title.trim() || undefined,
              note: pendingPhoto.note.trim() || null,
            }),
          }
        );
        const d1 = await r1.json().catch(() => null);
        if (!r1.ok || !d1?.success) {
          showError(d1?.error ?? "체크포인트 등록 실패");
          return;
        }
        const cpRow = d1.row as CheckpointRow;

        // 2) 사진 업로드
        const fd = new FormData();
        fd.append("file", pendingPhoto.file);
        if (pendingPhoto.takenAt) fd.append("taken_at", pendingPhoto.takenAt);

        const r2 = await fetch(
          `/api/admin/checkpoints/${cpRow.id}/photos`,
          { method: "POST", body: fd }
        );
        const d2 = await r2.json().catch(() => null);
        if (!r2.ok || !d2?.success) {
          showError(d2?.error ?? "사진 업로드 실패");
          // 체크포인트만 등록된 상태 — 그대로 두지 말지 결정. 일단 두기 (사용자가 사진 추가하면 됨)
        } else {
          const photoRow = d2.row as PhotoRow;
          setPhotosByCp((prev) => ({
            ...prev,
            [cpRow.id]: [...(prev[cpRow.id] ?? []), photoRow],
          }));
        }

        setCps((prev) =>
          [...prev, cpRow].sort((a, b) => a.sort_order - b.sort_order)
        );
        setSelectedId(cpRow.id);
        URL.revokeObjectURL(pendingPhoto.preview);
        setPendingPhoto(null);
        showInfo("사진으로 체크포인트가 추가되었습니다.");
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "등록 실패");
      }
    });
  };

  // === 기존 체크포인트 편집 ===
  const updateCp = (
    cpId: string,
    patch: Partial<Pick<CheckpointRow, "title" | "note" | "lng" | "lat">>
  ) => {
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/checkpoints/${cpId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          showError(data?.error ?? "저장 실패");
          return;
        }
        setCps((prev) =>
          prev.map((c) => (c.id === cpId ? { ...c, ...patch } : c))
        );
        showInfo("저장되었습니다.");
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  };

  const deleteCp = (cpId: string) => {
    if (!confirm("이 체크포인트와 첨부된 사진을 모두 삭제할까요?")) return;
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/checkpoints/${cpId}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          showError(data?.error ?? "삭제 실패");
          return;
        }
        setCps((prev) => prev.filter((c) => c.id !== cpId));
        setPhotosByCp((prev) => {
          const next = { ...prev };
          delete next[cpId];
          return next;
        });
        if (selectedId === cpId) setSelectedId(null);
        showInfo("삭제되었습니다.");
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "삭제 실패");
      }
    });
  };

  // 기존 체크포인트에 사진 추가
  const addPhotoToSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedId) return;
    if (!file.type.startsWith("image/")) {
      showError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    const exif = await extractExif(file);
    const fd = new FormData();
    fd.append("file", file);
    if (exif.takenAt) fd.append("taken_at", exif.takenAt);

    startSave(async () => {
      try {
        const res = await fetch(
          `/api/admin/checkpoints/${selectedId}/photos`,
          { method: "POST", body: fd }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          showError(data?.error ?? "사진 업로드 실패");
          return;
        }
        const row = data.row as PhotoRow;
        setPhotosByCp((prev) => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] ?? []), row],
        }));
        showInfo("사진이 추가되었습니다.");
      } catch (err: unknown) {
        showError(err instanceof Error ? err.message : "사진 업로드 실패");
      }
    });
  };

  const deletePhoto = (photoId: string) => {
    if (!selectedId) return;
    if (!confirm("이 사진을 삭제할까요?")) return;
    startSave(async () => {
      try {
        const res = await fetch(
          `/api/admin/checkpoints/${selectedId}/photos/${photoId}`,
          { method: "DELETE" }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          showError(data?.error ?? "삭제 실패");
          return;
        }
        setPhotosByCp((prev) => ({
          ...prev,
          [selectedId]:
            prev[selectedId]?.filter((p) => p.id !== photoId) ?? [],
        }));
        showInfo("사진이 삭제되었습니다.");
      } catch (err: unknown) {
        showError(err instanceof Error ? err.message : "삭제 실패");
      }
    });
  };

  // pendingPoint for map
  const mapPending =
    pendingMapClick != null
      ? { lat: pendingMapClick.lat, lng: pendingMapClick.lng }
      : pendingPhoto && pendingPhoto.lat != null && pendingPhoto.lng != null
        ? { lat: pendingPhoto.lat, lng: pendingPhoto.lng }
        : null;

  return (
    <div className="grid lg:grid-cols-[1fr_440px] gap-6">
      {/* Left: 지도 */}
      <div className="space-y-4">
        <CheckpointMap
          coordinates={coordinates}
          bounds={bounds ?? undefined}
          checkpoints={checkpointsForMap}
          selectedId={selectedId}
          addMode={addMode}
          pendingPoint={mapPending}
          onMapClick={onMapClick}
          onMarkerClick={(id) => setSelectedId(id)}
          height={560}
        />

        {addMode && (
          <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-orange-300" />
            <span className="flex-1 text-orange-100">
              지도에서 체크포인트로 지정할 위치를 클릭하세요.
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

        {/* 알림 */}
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

      {/* Right: 컨트롤 + 목록 + 상세 */}
      <div className="space-y-4">
        {/* 추가 컨트롤 */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            체크포인트 추가
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setAddMode((v) => !v);
                setPendingMapClick(null);
              }}
              disabled={saving || !!pendingPhoto}
              className={`h-10 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                addMode
                  ? "bg-orange-500 text-white"
                  : "bg-white/[0.06] hover:bg-white/[0.12] text-white"
              }`}
            >
              <Plus className="h-4 w-4" />
              지도 클릭
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || addMode}
              className="h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
            >
              <ImageIcon className="h-4 w-4" />
              사진으로
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onSelectPhoto}
          />
        </div>

        {/* 지도 클릭 — 등록 폼 */}
        {pendingMapClick && (
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/[0.06] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Plus className="h-4 w-4 text-orange-300" />새 체크포인트
            </div>
            <div className="text-[11px] text-gray-400 font-mono">
              {pendingMapClick.lat.toFixed(5)}, {pendingMapClick.lng.toFixed(5)}
            </div>
            <input
              type="text"
              value={pendingMapClick.title}
              onChange={(e) =>
                setPendingMapClick({ ...pendingMapClick, title: e.target.value })
              }
              placeholder="제목 (비우면 자동)"
              className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
            />
            <textarea
              value={pendingMapClick.note}
              onChange={(e) =>
                setPendingMapClick({ ...pendingMapClick, note: e.target.value })
              }
              placeholder="메모 (선택)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingMapClick(null)}
                disabled={saving}
                className="flex-1 h-9 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveMapClickCheckpoint}
                disabled={saving}
                className="flex-1 h-9 rounded-md bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                등록
              </button>
            </div>
          </div>
        )}

        {/* 사진 등록 폼 */}
        {pendingPhoto && (
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/[0.06] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <ImageIcon className="h-4 w-4 text-orange-300" />
              사진으로 체크포인트 추가
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingPhoto.preview}
              alt=""
              className="w-full max-h-48 object-cover rounded-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">
                  위도 (lat)
                </label>
                <input
                  type="number"
                  step="any"
                  value={pendingPhoto.lat ?? ""}
                  onChange={(e) =>
                    setPendingPhoto({
                      ...pendingPhoto,
                      lat:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-full h-9 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">
                  경도 (lng)
                </label>
                <input
                  type="number"
                  step="any"
                  value={pendingPhoto.lng ?? ""}
                  onChange={(e) =>
                    setPendingPhoto({
                      ...pendingPhoto,
                      lng:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-full h-9 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>
            {pendingPhoto.lat == null && (
              <div className="text-[11px] text-amber-300 flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  사진에 GPS 정보가 없어요. 위도/경도를 직접 입력해주세요.
                </span>
              </div>
            )}
            <input
              type="text"
              value={pendingPhoto.title}
              onChange={(e) =>
                setPendingPhoto({ ...pendingPhoto, title: e.target.value })
              }
              placeholder="제목 (비우면 자동)"
              className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
            />
            <textarea
              value={pendingPhoto.note}
              onChange={(e) =>
                setPendingPhoto({ ...pendingPhoto, note: e.target.value })
              }
              placeholder="메모 (선택)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(pendingPhoto.preview);
                  setPendingPhoto(null);
                }}
                disabled={saving}
                className="flex-1 h-9 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs"
              >
                취소
              </button>
              <button
                type="button"
                onClick={savePhotoCheckpoint}
                disabled={saving || pendingPhoto.lat == null || pendingPhoto.lng == null}
                className="flex-1 h-9 rounded-md bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                등록
              </button>
            </div>
          </div>
        )}

        {/* 체크포인트 목록 */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              목록
            </h3>
            <span className="text-[11px] text-gray-500 font-mono">
              {cps.length}개
            </span>
          </div>
          {cps.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-gray-500">
              아직 체크포인트가 없어요.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
              {cps.map((c) => {
                const isSel = selectedId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                      isSel
                        ? "bg-orange-500/10 border-l-2 border-orange-500"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        isSel
                          ? "bg-orange-500 text-white"
                          : "bg-white/[0.06] text-gray-400"
                      }`}
                    >
                      {c.sort_order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
                      </div>
                    </div>
                    {(photosByCp[c.id]?.length ?? 0) > 0 && (
                      <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 선택된 체크포인트 상세 */}
        {selected && (
          <CheckpointDetail
            key={selected.id}
            cp={selected}
            photos={photosByCp[selected.id] ?? []}
            saving={saving}
            onSaveMeta={(patch) => updateCp(selected.id, patch)}
            onDelete={() => deleteCp(selected.id)}
            onAddPhoto={addPhotoToSelected}
            onDeletePhoto={deletePhoto}
          />
        )}
      </div>
    </div>
  );
}

// === 선택된 체크포인트 상세 (분리) ===
type DetailProps = {
  cp: CheckpointRow;
  photos: PhotoRow[];
  saving: boolean;
  onSaveMeta: (patch: { title?: string; note?: string | null; lat?: number; lng?: number }) => void;
  onDelete: () => void;
  onAddPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeletePhoto: (photoId: string) => void;
};

function CheckpointDetail({
  cp,
  photos,
  saving,
  onSaveMeta,
  onDelete,
  onAddPhoto,
  onDeletePhoto,
}: DetailProps) {
  const [title, setTitle] = useState(cp.title);
  const [note, setNote] = useState(cp.note ?? "");
  const [lat, setLat] = useState(String(cp.lat));
  const [lng, setLng] = useState(String(cp.lng));
  const photoFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTitle(cp.title);
    setNote(cp.note ?? "");
    setLat(String(cp.lat));
    setLng(String(cp.lng));
  }, [cp.id, cp.title, cp.note, cp.lat, cp.lng]);

  const dirty =
    title !== cp.title ||
    note !== (cp.note ?? "") ||
    Number(lat) !== cp.lat ||
    Number(lng) !== cp.lng;

  const save = () => {
    const patch: Parameters<typeof onSaveMeta>[0] = {};
    if (title !== cp.title) patch.title = title;
    if (note !== (cp.note ?? "")) patch.note = note || null;
    const latN = Number(lat);
    const lngN = Number(lng);
    if (Number.isFinite(latN) && latN !== cp.lat) patch.lat = latN;
    if (Number.isFinite(lngN) && lngN !== cp.lng) patch.lng = lngN;
    onSaveMeta(patch);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[11px] font-bold text-white">
          {cp.sort_order}
        </span>
        <h3 className="text-sm font-medium text-white flex-1 truncate">
          {cp.title}
        </h3>
      </div>

      <div>
        <label className="block text-[10px] text-gray-500 mb-1">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
        />
      </div>

      <div>
        <label className="block text-[10px] text-gray-500 mb-1">메모</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50 resize-none"
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
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        변경사항 저장
      </button>

      {/* 사진 */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
            사진 {photos.length > 0 ? `(${photos.length})` : ""}
          </span>
          <button
            type="button"
            onClick={() => photoFileRef.current?.click()}
            disabled={saving}
            className="px-2.5 h-7 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11px] inline-flex items-center gap-1.5"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            사진 추가
          </button>
          <input
            ref={photoFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAddPhoto}
          />
        </div>
        {photos.length === 0 ? (
          <div className="text-[11px] text-gray-500 py-3 text-center bg-white/[0.02] rounded-lg">
            아직 사진이 없어요.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <div
                key={p.id}
                className="relative rounded-lg overflow-hidden border border-white/10 aspect-square group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPublicUrl(p.storage_bucket, p.storage_path)}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onDeletePhoto(p.id)}
                  disabled={saving}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500 text-white inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-white/10">
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="w-full h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-200 text-xs inline-flex items-center justify-center gap-2"
        >
          <Trash2 className="h-3.5 w-3.5" />
          이 체크포인트 삭제
        </button>
      </div>
    </div>
  );
}
