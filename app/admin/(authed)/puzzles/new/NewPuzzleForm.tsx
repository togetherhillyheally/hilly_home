"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import TrailPicker, { type TrailMini } from "@/components/admin/TrailPicker";
import AutocompleteInput from "@/components/admin/AutocompleteInput";
import {
  DIFFICULTY_TIERS,
  PUZZLE_GRID_COLS,
  PUZZLE_GRID_PIECES,
  PUZZLE_GRID_ROWS,
  TIER_BOTTLES,
} from "@/lib/puzzle-config";

export default function NewPuzzleForm() {
  const router = useRouter();
  const [submitting, startSubmit] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [trail, setTrail] = useState<TrailMini | null>(null);
  const [seriesName, setSeriesName] = useState("");
  const [collabTitle, setCollabTitle] = useState("");
  const [collabDescription, setCollabDescription] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onPickFile = (f: File) => {
    setError(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const submit = () => {
    setError(null);
    setSuccess(null);
    if (!name.trim()) {
      setError("퍼즐 이름을 입력해주세요.");
      return;
    }
    if (!file) {
      setError("퍼즐 이미지를 선택해주세요.");
      return;
    }
    startSubmit(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", name.trim());
        if (description.trim()) fd.append("description", description.trim());
        if (reward.trim()) fd.append("reward_description", reward.trim());
        fd.append("base_tier", String(difficulty));
        if (seriesName.trim()) {
          fd.append("series_name", seriesName.trim());
        } else if (trail) {
          fd.append("trail_id", trail.id);
        }
        if (collabTitle.trim()) fd.append("collab_title", collabTitle.trim());
        if (collabDescription.trim())
          fd.append("collab_description", collabDescription.trim());
        if (eventStart) fd.append("event_starts_at", eventStart);
        if (eventEnd) fd.append("event_ends_at", eventEnd);

        const res = await fetch(`/api/admin/puzzles`, {
          method: "POST",
          body: fd,
        });
        const data = (await res.json().catch(() => null)) as {
          success?: boolean;
          puzzle?: { id: string; name: string };
          error?: string;
        } | null;
        if (!res.ok || !data?.success || !data.puzzle) {
          setError(data?.error ?? `등록 실패 (${res.status})`);
          return;
        }
        setSuccess(`"${data.puzzle.name}" 등록 완료`);
        setTimeout(() => {
          router.push(`/admin/puzzles/${data.puzzle!.id}`);
        }, 800);
      } catch (e) {
        setError(e instanceof Error ? e.message : "네트워크 오류");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
      {/* 좌: 이미지 선택 + 격자 미리보기 */}
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-400 mb-1.5">퍼즐 이미지 *</div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="aspect-[4/3] bg-black/40 relative flex items-center justify-center">
              {previewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-600 text-xs">이미지를 선택해주세요</span>
              )}
              {previewUrl ? (
                <div
                  className="absolute inset-0 grid pointer-events-none"
                  style={{
                    gridTemplateRows: `repeat(${PUZZLE_GRID_ROWS}, 1fr)`,
                    gridTemplateColumns: `repeat(${PUZZLE_GRID_COLS}, 1fr)`,
                  }}
                >
                  {Array.from({ length: PUZZLE_GRID_PIECES }).map((_, i) => (
                    <div key={i} className="border border-white/10" />
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 h-10 text-sm text-gray-300 hover:bg-white/[0.04] border-t border-white/5 transition-colors"
            >
              <Upload className="h-4 w-4" />
              {previewUrl ? "이미지 변경" : "이미지 선택"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">격자</span>
            <span className="text-white font-mono">
              {PUZZLE_GRID_ROWS} × {PUZZLE_GRID_COLS} (고정)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">총 조각</span>
            <span className="text-white font-mono">{PUZZLE_GRID_PIECES}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">난이도</span>
            <span className="text-white font-mono">
              {difficulty} (물 {TIER_BOTTLES[difficulty]})
            </span>
          </div>
        </div>
      </div>

      {/* 우: 폼 */}
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-400 mb-1.5">퍼즐 이름 *</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 소노캄 180K 기념 퍼즐"
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
            placeholder="예: 스타벅스 쿠폰"
            className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-1.5">
            난이도 (완성 시 물병 수) — 격자는 4 × 4 고정
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DIFFICULTY_TIERS.map((opt) => {
              const selected = difficulty === opt.tier;
              return (
                <button
                  key={opt.tier}
                  type="button"
                  onClick={() => setDifficulty(opt.tier)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    selected
                      ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
                      : "bg-white/[0.04] text-gray-400 border-white/10 hover:text-white"
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="font-mono text-[10px] mt-0.5 opacity-70">
                    물 {TIER_BOTTLES[opt.tier]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-1.5">
            이벤트 기간 (비우면 상시)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={eventStart}
              onChange={(e) => setEventStart(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
            />
            <input
              type="date"
              value={eventEnd}
              onChange={(e) => setEventEnd(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
            />
          </div>
        </div>

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
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}
        {success ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 inline-flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{success}</span>
          </div>
        ) : null}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !name.trim() || !file}
            className="inline-flex items-center gap-1.5 px-5 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-medium"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {submitting ? "등록 중…" : "퍼즐 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
