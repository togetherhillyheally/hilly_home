"use client";

import { useState, useTransition, useCallback } from "react";
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
  prepareTrailFromGpxText,
  type PreparedTrailGeometry,
} from "@/lib/gpx-prep";

type Props = {
  trailId: string;
  currentDistanceKm: number | null;
  currentTotalAscentM: number | null;
};

type Pending = {
  file: File;
  prep: PreparedTrailGeometry;
};

export default function ReplaceGpxForm({
  trailId,
  currentDistanceKm,
  currentTotalAscentM,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [resetSE, setResetSE] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setError(null);
      setSuccess(null);
      setAnalyzing(true);
      try {
        const text = await file.text();
        const prep = prepareTrailFromGpxText(text);
        setPending({ file, prep });
      } catch (err: unknown) {
        setPending(null);
        setError(err instanceof Error ? err.message : "GPX 파싱 실패");
      } finally {
        setAnalyzing(false);
      }
    },
    []
  );

  const clearPending = () => {
    setPending(null);
    setResetSE(false);
    setError(null);
  };

  const submit = () => {
    if (!pending) return;
    setError(null);
    setSuccess(null);

    const form = new FormData();
    form.append("file", pending.file);
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
        setPending(null);
        setResetSE(false);
        router.refresh();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "교체 실패");
      }
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
      <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
        GPX 파일 교체
      </h3>
      <p className="text-xs text-gray-500 leading-relaxed">
        새 GPX 파일을 올리면 거리·고도·경로가 다시 계산되고, Storage 의 원본
        파일도 덮어쓰여요. 체크포인트는 그대로 유지됩니다.
      </p>

      {!pending && (
        <label
          className={`block rounded-lg border border-dashed border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04] p-4 text-center text-sm transition-colors ${
            analyzing ? "opacity-50 pointer-events-none" : "cursor-pointer"
          }`}
        >
          {analyzing ? (
            <span className="inline-flex items-center gap-2 text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              분석 중…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-gray-300">
              <RefreshCw className="h-4 w-4" />새 GPX 파일 선택
            </span>
          )}
          <input
            type="file"
            accept=".gpx"
            className="hidden"
            onChange={onFile}
            disabled={analyzing}
          />
        </label>
      )}

      {pending && (
        <div className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-white truncate flex-1 min-w-0">
              {pending.file.name}
            </span>
            <button
              type="button"
              onClick={clearPending}
              disabled={submitting}
              className="text-gray-500 hover:text-white p-1"
              aria-label="취소"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 변경 사항 미리보기 */}
          <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">거리</span>
              <span className="font-mono inline-flex items-center gap-2">
                <span className="text-gray-400">
                  {currentDistanceKm != null
                    ? `${Number(currentDistanceKm).toFixed(1)} km`
                    : "—"}
                </span>
                <ArrowRight className="h-3 w-3 text-gray-600" />
                <span className="text-white">{pending.prep.distanceKm} km</span>
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
                <span className="text-white">{pending.prep.totalAscentM} m</span>
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
              시작/끝 지점도 자동(GPX 첫·마지막 점)으로 리셋
              <span className="block text-[10px] text-gray-500 mt-0.5">
                코스가 많이 달라져 기존 지정 좌표가 새 경로 밖일 때 선택
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full h-10 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                교체 중…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                이 파일로 교체
              </>
            )}
          </button>
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
