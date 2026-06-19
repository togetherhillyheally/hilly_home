"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import {
  prepareTrailFromGpxText,
  displayNameFromFileName,
  type PreparedTrailGeometry,
} from "@/lib/gpx-prep";
import TrailMapPreview from "@/components/admin/TrailMapPreview";
import SeriesNameInput, {
  invalidateSeriesNamesCache,
} from "@/components/admin/SeriesNameInput";

type ActivityType = "walking" | "running" | "cycling";

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  walking: "걷기",
  running: "달리기",
  cycling: "자전거",
};

type FileEntry = {
  file: File;
  prep?: PreparedTrailGeometry;
  parseError?: string;
};

type AnalyzingState = { done: number; total: number; currentFileName: string };

export default function UploadForm() {
  const router = useRouter();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([
    "walking",
    "running",
  ]);
  const [analyzing, setAnalyzing] = useState<AnalyzingState | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; name: string } | null>(
    null
  );

  const validEntries = useMemo(
    () => entries.filter((e) => e.prep && !e.parseError),
    [entries]
  );

  // 다중 파일 머지 — preview용
  const merged = useMemo(() => {
    if (validEntries.length === 0) return null;
    const preps = validEntries.map((e) => e.prep!);
    const bounds = preps.reduce(
      (acc, p) => ({
        minLat: Math.min(acc.minLat, p.bounds.minLat),
        maxLat: Math.max(acc.maxLat, p.bounds.maxLat),
        minLon: Math.min(acc.minLon, p.bounds.minLon),
        maxLon: Math.max(acc.maxLon, p.bounds.maxLon),
      }),
      preps[0].bounds
    );
    const distanceKm =
      Math.round(preps.reduce((s, p) => s + p.distanceKm, 0) * 10) / 10;
    const totalAscentM = Math.round(
      preps.reduce((s, p) => s + p.totalAscentM, 0)
    );

    type Coord = [number, number] | [number, number, number];
    const isMulti = (
      c: PreparedTrailGeometry["coordinates"]
    ): c is Coord[][] =>
      c.length > 0 &&
      Array.isArray(c[0]) &&
      (c[0] as unknown[]).length > 0 &&
      Array.isArray((c[0] as unknown[])[0]);

    const allRoutes: Coord[][] = preps.flatMap((p) =>
      isMulti(p.coordinates) ? p.coordinates : [p.coordinates as Coord[]]
    );

    return {
      bounds,
      distanceKm,
      totalAscentM,
      coordinates:
        allRoutes.length === 1 ? (allRoutes[0] as Coord[]) : allRoutes,
      defaultName:
        preps[0].nameFromGpx ?? displayNameFromFileName(validEntries[0].file.name),
    };
  }, [validEntries]);

  const finalName = name.trim() || merged?.defaultName || "";

  const ingestFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith(".gpx")
    );
    if (arr.length === 0) return;

    setAnalyzing({ done: 0, total: arr.length, currentFileName: arr[0].name });
    const ingested: FileEntry[] = [];
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      setAnalyzing({ done: i, total: arr.length, currentFileName: file.name });
      // 다음 paint 까지 양보해서 진행 표시가 UI에 반영되도록 함
      await new Promise((r) => setTimeout(r, 0));
      try {
        const text = await file.text();
        const prep = prepareTrailFromGpxText(text);
        ingested.push({ file, prep });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "GPX 파싱 실패";
        ingested.push({ file, parseError: msg });
      }
    }
    setAnalyzing(null);
    setEntries((prev) => [...prev, ...ingested]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      void ingestFiles(e.dataTransfer.files);
    },
    [ingestFiles]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) void ingestFiles(e.target.files);
      e.target.value = "";
    },
    [ingestFiles]
  );

  const removeEntry = (idx: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== idx));

  const toggleActivity = (t: ActivityType) => {
    setActivityTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const submit = () => {
    if (validEntries.length === 0) {
      setError("GPX 파일을 1개 이상 첨부해주세요.");
      return;
    }
    if (activityTypes.length === 0) {
      setError("활동 유형을 1개 이상 선택해주세요.");
      return;
    }
    setError(null);

    const form = new FormData();
    for (const e of validEntries) form.append("files", e.file);
    form.append("name", finalName);
    form.append("series_name", seriesName.trim());
    form.append("activity_types", activityTypes.join(","));

    startSubmit(async () => {
      try {
        const res = await fetch("/api/admin/trails/upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "업로드 실패");
          return;
        }
        setSuccess({ id: data.trail.id, name: data.trail.name });
        if (seriesName.trim()) invalidateSeriesNamesCache();
        // 짧은 대기 후 목록으로
        setTimeout(() => router.push("/admin/trails"), 1200);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "업로드 실패");
      }
    });
  };

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-white mb-1">업로드 완료</h2>
        <p className="text-sm text-gray-300">
          <span className="font-medium">{success.name}</span> 코스가 등록되었습니다.
          잠시 후 목록으로 이동합니다…
        </p>
      </div>
    );
  }

  const busy = !!analyzing || submitting;

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6">
      {/* Left: 파일 + 미리보기 */}
      <div className="space-y-5">
        {/* 분석 중 / 업로드 중 진행 표시 */}
        {analyzing && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.08] p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-orange-300 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium">
                지도 파일 분석 중… ({analyzing.done + 1}/{analyzing.total})
              </div>
              <div className="text-xs text-gray-400 truncate mt-0.5">
                {analyzing.currentFileName}
              </div>
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-pink-400 transition-all duration-200"
                  style={{
                    width: `${Math.round(
                      ((analyzing.done + 0.5) / analyzing.total) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {submitting && (
          <div className="rounded-xl border border-pink-500/30 bg-pink-500/[0.08] p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-pink-300 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium">
                코스 지도 업로드 중…
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                GPX 파일을 서버에 저장하고 DB에 등록하고 있어요.
              </div>
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-pink-400 animate-pulse w-full" />
              </div>
            </div>
          </div>
        )}

        {/* 드롭존 */}
        <div
          onDragOver={(e) => {
            if (busy) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (busy) return;
            onDrop(e);
          }}
          aria-disabled={busy}
          className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            busy ? "opacity-60 pointer-events-none" : ""
          } ${
            dragOver
              ? "border-orange-500/60 bg-orange-500/[0.06]"
              : "border-white/15 bg-white/[0.02]"
          }`}
        >
          <UploadCloud className="h-10 w-10 text-gray-500 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">
            GPX 파일을 끌어다 놓거나 클릭해서 선택
          </p>
          <p className="text-xs text-gray-500 mb-4">
            여러 파일을 함께 올리면 하나의 멀티 경로로 합쳐집니다.
          </p>
          <label
            className={`inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm ${
              busy ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <UploadCloud className="h-4 w-4" />
            파일 선택
            <input
              type="file"
              accept=".gpx"
              multiple
              disabled={busy}
              className="hidden"
              onChange={onFileInput}
            />
          </label>
        </div>

        {/* 파일 목록 */}
        {entries.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
            {entries.map((e, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <FileText
                  className={`h-4 w-4 flex-shrink-0 ${
                    e.parseError ? "text-red-400" : "text-gray-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white truncate">{e.file.name}</div>
                  {e.prep ? (
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {e.prep.distanceKm}km · 고도{" "}
                      {e.prep.totalAscentM}m
                      {e.prep.nameFromGpx ? ` · "${e.prep.nameFromGpx}"` : ""}
                    </div>
                  ) : null}
                  {e.parseError && (
                    <div className="text-[11px] text-red-400 mt-0.5">
                      {e.parseError}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  className="text-gray-500 hover:text-white p-1"
                  aria-label="제거"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 지도 미리보기 */}
        {merged && (
          <div>
            <div className="text-xs text-gray-400 mb-2 flex items-center justify-between">
              <span>경로 미리보기</span>
              <span className="font-mono">
                {merged.distanceKm}km · ↑{merged.totalAscentM}m
              </span>
            </div>
            <TrailMapPreview
              coordinates={merged.coordinates}
              bounds={merged.bounds}
              height={420}
            />
          </div>
        )}
      </div>

      {/* Right: 메타정보 + 제출 */}
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              지도 이름 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={merged?.defaultName ?? "예: 지리산 둘레길"}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
            />
            {!name.trim() && merged?.defaultName && (
              <p className="text-[11px] text-gray-500 mt-1">
                비워두면 자동으로 “{merged.defaultName}” 사용
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              시리즈명 (선택)
            </label>
            <SeriesNameInput
              value={seriesName}
              onChange={setSeriesName}
              placeholder="예: 동서트레일"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              활동 유형
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((t) => {
                const active = activityTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleActivity(t)}
                    className={`px-3 h-8 rounded-md border text-xs font-medium transition-colors ${
                      active
                        ? "bg-orange-500/20 border-orange-500/50 text-orange-200"
                        : "bg-white/[0.04] border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    {ACTIVITY_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {merged && (
            <div className="pt-3 border-t border-white/10 text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>총 거리</span>
                <span className="font-mono text-gray-200">
                  {merged.distanceKm}km
                </span>
              </div>
              <div className="flex justify-between">
                <span>누적 상승</span>
                <span className="font-mono text-gray-200">
                  {merged.totalAscentM}m
                </span>
              </div>
              <div className="flex justify-between">
                <span>파일 수</span>
                <span className="font-mono text-gray-200">
                  {validEntries.length}개
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={submitting || validEntries.length === 0}
          className="w-full h-11 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-white/[0.06] disabled:text-gray-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "업로드 중…" : "등록"}
        </button>
      </div>
    </div>
  );
}
