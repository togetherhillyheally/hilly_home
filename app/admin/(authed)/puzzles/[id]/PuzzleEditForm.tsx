"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Upload } from "lucide-react";
import TrailPicker, { type TrailMini } from "@/components/admin/TrailPicker";
import AutocompleteInput from "@/components/admin/AutocompleteInput";

export type PuzzleFull = {
  id: string;
  name: string;
  description: string | null;
  total_pieces: number;
  cover_image_url: string | null;
  image_url: string | null;
  is_active: boolean;
  grid_rows: number;
  grid_cols: number;
  reward_description: string | null;
  trail_id: string | null;
  base_tier: number;
  puzzle_type: string | null;
  series_name: string | null;
  collab_title: string | null;
  collab_description: string | null;
  created_at: string;
};

const DIFFICULTY_OPTIONS = [
  { label: "쉬움", target: 25 },
  { label: "보통-", target: 36 },
  { label: "보통", target: 49 },
  { label: "어려움-", target: 64 },
  { label: "어려움", target: 81 },
];

/** 이미지 비율(W/H) + 목표 셀 수 → rows × cols */
function computeGrid(
  aspect: number,
  target: number
): { rows: number; cols: number } {
  const rows = Math.max(3, Math.round(Math.sqrt(target / aspect)));
  const cols = Math.max(3, Math.round(Math.sqrt(target * aspect)));
  return { rows, cols };
}

function closestDifficultyIdx(total: number): number {
  let bestIdx = 0;
  let bestDiff = Infinity;
  DIFFICULTY_OPTIONS.forEach((o, i) => {
    const d = Math.abs(o.target - total);
    if (d < bestDiff) {
      bestDiff = d;
      bestIdx = i;
    }
  });
  return bestIdx;
}

export default function PuzzleEditForm({ puzzle }: { puzzle: PuzzleFull }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(puzzle.name);
  const [description, setDescription] = useState(puzzle.description ?? "");
  const [reward, setReward] = useState(puzzle.reward_description ?? "");
  const [trail, setTrail] = useState<TrailMini | null>(null);
  const [seriesName, setSeriesName] = useState<string>(
    puzzle.series_name ?? ""
  );
  const [collabTitle, setCollabTitle] = useState(puzzle.collab_title ?? "");
  const [collabDescription, setCollabDescription] = useState(
    puzzle.collab_description ?? ""
  );

  const initialTotal = puzzle.grid_rows * puzzle.grid_cols;
  const [gridIndex, setGridIndex] = useState(closestDifficultyIdx(initialTotal));
  const [imageAspect, setImageAspect] = useState(
    puzzle.grid_cols / puzzle.grid_rows
  );

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    puzzle.image_url ?? puzzle.cover_image_url
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // trail_id → TrailMini prefetch
  useEffect(() => {
    let cancelled = false;
    if (!puzzle.trail_id) return;
    fetch(`/api/admin/trails/search?limit=200`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { rows?: TrailMini[] }) => {
        if (cancelled) return;
        const found = (d.rows ?? []).find((t) => t.id === puzzle.trail_id);
        if (found) setTrail(found);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [puzzle.trail_id]);

  // 이미지 aspect 재계산: 새 이미지가 로드되면 자연 크기로부터
  const imgOnLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    if (el.naturalWidth > 0 && el.naturalHeight > 0) {
      setImageAspect(el.naturalWidth / el.naturalHeight);
    }
  };

  const dirty = useMemo(() => {
    if (name.trim() !== puzzle.name) return true;
    if ((description.trim() || null) !== (puzzle.description ?? null))
      return true;
    if ((reward.trim() || null) !== (puzzle.reward_description ?? null))
      return true;
    const curTrailId = trail?.id ?? null;
    if (curTrailId !== (puzzle.trail_id ?? null)) return true;
    const curSeries = seriesName.trim() || null;
    if (curSeries !== (puzzle.series_name ?? null)) return true;
    if ((collabTitle.trim() || null) !== (puzzle.collab_title ?? null))
      return true;
    if (
      (collabDescription.trim() || null) !== (puzzle.collab_description ?? null)
    )
      return true;
    const grid = computeGrid(imageAspect, DIFFICULTY_OPTIONS[gridIndex].target);
    if (grid.rows !== puzzle.grid_rows || grid.cols !== puzzle.grid_cols)
      return true;
    return false;
  }, [
    name,
    description,
    reward,
    trail,
    seriesName,
    collabTitle,
    collabDescription,
    gridIndex,
    imageAspect,
    puzzle,
  ]);

  const uploadImage = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/puzzles/${puzzle.id}/image`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? `업로드 실패 (${res.status})`);
        return;
      }
      const data = (await res.json()) as { url: string };
      setCurrentImageUrl(data.url);
      setMsg("이미지 교체 완료");
      startTransition(() => router.refresh());
    } catch {
      setError("네트워크 오류");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError(null);
    setMsg(null);
    if (!name.trim()) {
      setError("퍼즐 이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const grid = computeGrid(
        imageAspect,
        DIFFICULTY_OPTIONS[gridIndex].target
      );
      // 트레일·시리즈 상호배타 — 클라이언트에서도 강제
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        reward_description: reward.trim() || null,
        grid_rows: grid.rows,
        grid_cols: grid.cols,
        trail_id: seriesName.trim() ? null : trail?.id ?? null,
        series_name: trail ? null : seriesName.trim() || null,
        collab_title: collabTitle.trim() || null,
        collab_description: collabDescription.trim() || null,
      };
      const res = await fetch(`/api/admin/puzzles/${puzzle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? `저장 실패 (${res.status})`);
        return;
      }
      setMsg("저장 완료");
      startTransition(() => router.refresh());
    } catch {
      setError("네트워크 오류");
    } finally {
      setSaving(false);
    }
  };

  const computedGrid = computeGrid(
    imageAspect,
    DIFFICULTY_OPTIONS[gridIndex].target
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
      {/* 좌: 이미지 + 격자 미리보기 */}
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-400 mb-1.5">이미지</div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="aspect-[4/3] bg-black/40 relative flex items-center justify-center">
              {currentImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImageUrl}
                  alt={puzzle.name}
                  className="w-full h-full object-cover"
                  onLoad={imgOnLoad}
                />
              ) : (
                <span className="text-gray-600 text-xs">이미지 없음</span>
              )}
              {uploading ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              ) : null}
              {/* 격자 오버레이 */}
              {currentImageUrl ? (
                <div
                  className="absolute inset-0 grid pointer-events-none"
                  style={{
                    gridTemplateRows: `repeat(${computedGrid.rows}, 1fr)`,
                    gridTemplateColumns: `repeat(${computedGrid.cols}, 1fr)`,
                  }}
                >
                  {Array.from({ length: computedGrid.rows * computedGrid.cols }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className="border border-white/10"
                      />
                    )
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 h-10 text-sm text-gray-300 hover:bg-white/[0.04] border-t border-white/5 transition-colors"
            >
              <Upload className="h-4 w-4" /> 이미지 교체
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        {/* 격자·티어 요약 */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">격자</span>
            <span className="text-white font-mono">
              {computedGrid.rows} × {computedGrid.cols}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">총 조각</span>
            <span className="text-white font-mono">
              {computedGrid.rows * computedGrid.cols}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">기본 티어</span>
            <span className="text-white font-mono">
              {Math.max(
                1,
                Math.min(
                  5,
                  Math.max(computedGrid.rows, computedGrid.cols) - 2
                )
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 우: 편집 폼 */}
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-400 mb-1.5">퍼즐 이름</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-1.5">설명 (선택)</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
          />
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-1.5">완성 보상 (선택)</div>
          <input
            type="text"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* 난이도 (5단) */}
        <div>
          <div className="text-xs text-gray-400 mb-1.5">
            난이도 · 이미지 비율에 맞춰 rows × cols 자동 계산
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DIFFICULTY_OPTIONS.map((opt, i) => {
              const g = computeGrid(imageAspect, opt.target);
              const selected = gridIndex === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGridIndex(i)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    selected
                      ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
                      : "bg-white/[0.04] text-gray-400 border-white/10 hover:text-white"
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="font-mono text-[10px] mt-0.5 opacity-70">
                    {g.rows}×{g.cols}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 트레일 (시리즈 미선택 시) */}
        {!seriesName.trim() ? (
          <div>
            <div className="text-xs text-gray-400 mb-1.5">
              연결 트레일 (선택 · 시리즈와 상호배타)
            </div>
            <TrailPicker
              value={trail}
              onChange={(t) => {
                setTrail(t);
                if (t) setSeriesName("");
              }}
            />
          </div>
        ) : null}

        {/* 시리즈 (트레일 미선택 시) */}
        {!trail ? (
          <div>
            <div className="text-xs text-gray-400 mb-1.5">
              연결 시리즈 (선택 · 트레일과 상호배타)
            </div>
            <AutocompleteInput
              value={seriesName}
              onChange={(v) => {
                setSeriesName(v);
                if (v.trim()) setTrail(null);
              }}
              fetchUrl="/api/admin/trails/series-names"
              cacheKey="series-names"
              placeholder="시리즈명 입력 또는 선택"
            />
          </div>
        ) : null}

        {/* 콜라보 (트레일 또는 시리즈 선택 시) */}
        {trail || seriesName.trim() ? (
          <>
            <div>
              <div className="text-xs text-gray-400 mb-1.5">
                콜라보 제목 (참여 안내 모달 제목)
              </div>
              <input
                type="text"
                value={collabTitle}
                onChange={(e) => setCollabTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1.5">
                콜라보 소개 (선택)
              </div>
              <textarea
                value={collabDescription}
                onChange={(e) => setCollabDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
          </>
        ) : null}

        {error ? (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        ) : null}
        {msg ? (
          <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
            {msg}
          </div>
        ) : null}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 px-5 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-medium"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
