"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
} from "lucide-react";
import {
  prepareTrailFromText,
  mergeMultiGeometry,
  type PreparedTrailGeometry,
} from "@/lib/gpx-prep";

type Props = {
  trailId: string;
  currentDistanceKm: number | null;
  currentTotalAscentM: number | null;
};

type Entry =
  | { file: File; prep: PreparedTrailGeometry; parseError?: undefined }
  | { file: File; prep?: undefined; parseError: string };

export default function ReplaceGpxForm({
  trailId,
  currentDistanceKm,
  currentTotalAscentM,
}: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [analyzing, setAnalyzing] = useState<{
    done: number;
    total: number;
    currentFileName: string;
  } | null>(null);
  const [resetSE, setResetSE] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const validEntries = useMemo(
    () => entries.filter((e): e is Extract<Entry, { prep: PreparedTrailGeometry }> => !!e.prep),
    [entries]
  );

  const merged = useMemo(() => {
    if (validEntries.length === 0) return null;
    return mergeMultiGeometry(validEntries.map((e) => e.prep));
  }, [validEntries]);

  const ingestFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => {
      const n = f.name.toLowerCase();
      return n.endsWith(".gpx") || n.endsWith(".kml");
    });
    if (arr.length === 0) return;

    setAnalyzing({ done: 0, total: arr.length, currentFileName: arr[0].name });
    const ingested: Entry[] = [];
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      setAnalyzing({ done: i, total: arr.length, currentFileName: file.name });
      await new Promise((r) => setTimeout(r, 0));
      try {
        const text = await file.text();
        const prep = prepareTrailFromText(text);
        ingested.push({ file, prep });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "파일 파싱 실패";
        ingested.push({ file, parseError: msg });
      }
    }
    setAnalyzing(null);
    setEntries((prev) => [...prev, ...ingested]);
  }, []);

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) void ingestFiles(e.target.files);
      e.target.value = "";
    },
    [ingestFiles]
  );

  const removeEntry = (idx: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== idx));

  const clearAll = () => {
    setEntries([]);
    setResetSE(false);
    setError(null);
  };

  const submit = () => {
    if (validEntries.length === 0) return;
    setError(null);
    setSuccess(null);

    const form = new FormData();
    for (const e of validEntries) form.append("files", e.file);
    if (resetSE) form.append("reset_start_end", "true");

    startSubmit(async () => {
      try {
        const res = await fetch(
          `/api/admin/trails/${trailId}/replace-gpx`,
          { method: "POST", body: form }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "교체 실패");
          return;
        }
        setSuccess("교체되었습니다.");
        clearAll();
        router.refresh();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "교체 실패");
      }
    });
  };

  const busy = !!analyzing || submitting;
  const hasFiles = entries.length > 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
      <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
        GPX / KML 파일 교체
      </h3>
      <p className="text-xs text-gray-500 leading-relaxed">
        새 GPX 또는 KML 파일을 올리면 거리·고도·경로가 다시 계산되고, Storage 의
        원본 파일도 덮어쓰여요. 여러 파일 선택 시 한 지도로 병합됩니다.
        체크포인트는 그대로 유지됩니다.
      </p>

      <label
        className={`block rounded-lg border border-dashed border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04] p-4 text-center text-sm transition-colors ${
          busy ? "opacity-50 pointer-events-none" : "cursor-pointer"
        }`}
      >
        {analyzing ? (
          <span className="inline-flex items-center gap-2 text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            분석 중… {analyzing.done + 1}/{analyzing.total}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-gray-300">
            <RefreshCw className="h-4 w-4" />
            {hasFiles ? "파일 추가 선택" : "새 GPX/KML 파일 선택"}
          </span>
        )}
        <input
          type="file"
          accept=".gpx,.kml"
          multiple
          className="hidden"
          onChange={onFileInput}
          disabled={busy}
        />
      </label>

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div
              key={`${e.file.name}-${i}`}
              className={`rounded-lg border p-3 flex items-center gap-2 ${
                e.parseError
                  ? "border-red-500/30 bg-red-500/[0.05]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{e.file.name}</div>
                {e.prep ? (
                  <div className="text-[11px] text-gray-500 font-mono">
                    {e.prep.distanceKm}km · ↑{e.prep.totalAscentM}m
                  </div>
                ) : (
                  <div className="text-[11px] text-red-300">{e.parseError}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeEntry(i)}
                disabled={submitting}
                className="text-gray-500 hover:text-white p-1"
                aria-label="제거"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {merged && (
        <div className="space-y-3">
          {/* 변경 사항 미리보기 */}
          <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">
                거리
                {validEntries.length > 1
                  ? ` (합계 ${validEntries.length}개)`
                  : ""}
              </span>
              <span className="font-mono inline-flex items-center gap-2">
                <span className="text-gray-400">
                  {currentDistanceKm != null
                    ? `${Number(currentDistanceKm).toFixed(1)} km`
                    : "—"}
                </span>
                <ArrowRight className="h-3 w-3 text-gray-600" />
                <span className="text-white">{merged.distanceKm} km</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">누적 상승</span>
              <span className="font-mono inline-flex items-center gap-2">
                <span className="text-gray-400">
                  {currentTotalAscentM != null
                    ? `${currentTotalAscentM} m`
                    : "—"}
                </span>
                <ArrowRight className="h-3 w-3 text-gray-600" />
                <span className="text-white">{merged.totalAscentM} m</span>
              </span>
            </div>
          </div>

          {/* 시작/끝 리셋 옵션 */}
          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={resetSE}
              onChange={(e) => setResetSE(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 accent-orange-500"
            />
            <span className="text-gray-300 leading-relaxed">
              시작/끝 지점도 자동(경로 첫·마지막 점)으로 리셋
              <span className="block text-[10px] text-gray-500 mt-0.5">
                코스가 많이 달라져 기존 지정 좌표가 새 경로 밖일 때 선택
              </span>
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex-1 h-10 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  교체 중…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  이 파일{validEntries.length > 1 ? `들 (${validEntries.length}개)` : ""}로 교체
                </>
              )}
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={submitting}
              className="h-10 px-3 rounded-lg border border-white/10 hover:border-white/30 text-gray-400 hover:text-white text-xs"
            >
              전체 취소
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
