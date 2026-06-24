"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import SeriesNameInput, {
  invalidateSeriesNamesCache,
} from "@/components/admin/SeriesNameInput";

type ActivityType = "walking" | "running" | "cycling";

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  walking: "걷기",
  running: "달리기",
  cycling: "자전거",
};

type Props = {
  trailId: string;
  initialName: string;
  initialSeriesName: string | null;
  initialCourseSummary: string | null;
  initialActivityTypes: ActivityType[];
  /** 메타 편집 박스와 위험 구역 사이에 끼워 넣을 추가 영역 (예: GPX 교체 폼). */
  children?: React.ReactNode;
};

export default function EditForm({
  trailId,
  initialName,
  initialSeriesName,
  initialCourseSummary,
  initialActivityTypes,
  children,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [seriesName, setSeriesName] = useState(initialSeriesName ?? "");
  const [courseSummary, setCourseSummary] = useState(
    initialCourseSummary ?? ""
  );
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(
    initialActivityTypes
  );
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty =
    name.trim() !== initialName ||
    (seriesName.trim() || null) !== initialSeriesName ||
    (courseSummary.trim() || null) !== initialCourseSummary ||
    activityTypes.slice().sort().join(",") !==
      initialActivityTypes.slice().sort().join(",");

  const toggleActivity = (t: ActivityType) => {
    setActivityTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const save = () => {
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    setError(null);
    setSaveMsg(null);
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            series_name: seriesName.trim() || null,
            course_summary: courseSummary.trim() || null,
            activity_types: activityTypes,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "저장 실패");
          return;
        }
        setSaveMsg("저장되었습니다.");
        // 시리즈명이 바뀌었거나 신규 추가되었으면 자동완성 캐시 무효화
        if (seriesName.trim() !== (initialSeriesName ?? "")) {
          invalidateSeriesNamesCache();
        }
        router.refresh();
        setTimeout(() => setSaveMsg(null), 2500);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  };

  const remove = () => {
    setError(null);
    startDelete(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "삭제 실패");
          return;
        }
        router.push("/admin/trails");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "삭제 실패");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
        <h3 className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">
          정보 수정
        </h3>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            지도 이름 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">시리즈명</label>
          <SeriesNameInput
            value={seriesName}
            onChange={setSeriesName}
            placeholder="예: 동서트레일"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            코스 요약
          </label>
          <textarea
            value={courseSummary}
            onChange={(e) => setCourseSummary(e.target.value)}
            rows={5}
            placeholder="앱 상세 화면에 표시되는 코스 설명. 예: 동서트레일 1구간으로 가벼운 워킹에 적합한 평탄한 길이 이어집니다."
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50 resize-y leading-relaxed"
          />
          <p className="mt-1 text-[10px] text-gray-500">
            {courseSummary.length}자
          </p>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">활동 유형</label>
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

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {saveMsg && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{saveMsg}</span>
          </div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="w-full h-10 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-white/[0.06] disabled:text-gray-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              저장 중…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              변경사항 저장
            </>
          )}
        </button>
      </div>

      {children}

      {/* 삭제 영역 */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-5">
        <h3 className="text-xs text-red-300 font-medium mb-2 uppercase tracking-wider">
          위험 구역
        </h3>
        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
          삭제하면 코스 지도뿐 아니라 연결된 체크포인트·체크포인트 사진·GPX
          원본 파일까지 영구 삭제됩니다. 되돌릴 수 없어요.
        </p>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full h-10 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-200 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            이 지도 삭제…
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-red-200 font-medium">
              정말 삭제하시겠어요?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-sm inline-flex items-center justify-center gap-2 transition-colors"
              >
                <X className="h-4 w-4" />
                취소
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 disabled:bg-red-500/40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    삭제 중…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    영구 삭제
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
