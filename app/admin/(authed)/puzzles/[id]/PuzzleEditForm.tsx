"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Grid3x3, Loader2, Save, Upload } from "lucide-react";
import TrailPicker, { type TrailMini } from "@/components/admin/TrailPicker";
import AutocompleteInput from "@/components/admin/AutocompleteInput";
import {
  DIFFICULTY_TIERS,
  PUZZLE_GRID_COLS,
  PUZZLE_GRID_PIECES,
  PUZZLE_GRID_ROWS,
  TIER_BOTTLES,
  TIER_SEED_MULTIPLIER,
  isoToDateInput,
} from "@/lib/puzzle-config";

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
  event_starts_at: string | null;
  event_ends_at: string | null;
  puzzle_type: string | null;
  series_name: string | null;
  collab_title: string | null;
  collab_description: string | null;
  created_at: string;
  /** 메타 퍼즐(구간 완성으로만 조각 획득) / 상위 퍼즐 연결 (2026-10-16) */
  is_meta?: boolean | null;
  parent_puzzle_id?: string | null;
  parent_cell_index?: number | null;
};

export type MetaPuzzleOption = { id: string; name: string; grid_rows: number; grid_cols: number };

export default function PuzzleEditForm({
  puzzle,
  metaPuzzles = [],
}: {
  puzzle: PuzzleFull;
  metaPuzzles?: MetaPuzzleOption[];
}) {
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
  // 메타 퍼즐 / 상위 퍼즐 연결
  const [isMeta, setIsMeta] = useState<boolean>(puzzle.is_meta === true);
  const [parentId, setParentId] = useState<string>(puzzle.parent_puzzle_id ?? "");
  const [parentCell, setParentCell] = useState<string>(
    puzzle.parent_cell_index == null ? "" : String(puzzle.parent_cell_index)
  );
  const parentOpt = metaPuzzles.find((m) => m.id === parentId) ?? null;
  const parentCells = parentOpt ? parentOpt.grid_rows * parentOpt.grid_cols : 0;

  const [difficulty, setDifficulty] = useState(
    Math.max(1, Math.min(4, puzzle.base_tier ?? 1))
  );
  // 이벤트 기간 (date input 값) — 빈 문자열 = 상시
  const [eventStart, setEventStart] = useState(
    isoToDateInput(puzzle.event_starts_at)
  );
  const [eventEnd, setEventEnd] = useState(isoToDateInput(puzzle.event_ends_at));

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    puzzle.image_url ?? puzzle.cover_image_url
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingGrid, setChangingGrid] = useState(false);
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
    if (difficulty !== Math.max(1, Math.min(4, puzzle.base_tier ?? 1)))
      return true;
    if (eventStart !== isoToDateInput(puzzle.event_starts_at)) return true;
    if (eventEnd !== isoToDateInput(puzzle.event_ends_at)) return true;
    return false;
  }, [
    name,
    description,
    reward,
    trail,
    seriesName,
    collabTitle,
    collabDescription,
    difficulty,
    eventStart,
    eventEnd,
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
      // 이벤트 기간 — 시작은 그날 0시, 종료는 그날 23:59:59 (그날까지 유효)
      const startIso = eventStart
        ? new Date(`${eventStart}T00:00:00`).toISOString()
        : null;
      const endIso = eventEnd
        ? new Date(`${eventEnd}T23:59:59.999`).toISOString()
        : null;
      // 격자(grid_rows/grid_cols)는 저장 시 건드리지 않는다 — 신규는 4×4 로
      // 고정 생성, 기존 퍼즐은 플레이 중 조각 상태 보호를 위해 보존 (2026-10-11)
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        reward_description: reward.trim() || null,
        base_tier: difficulty,
        event_starts_at: startIso,
        event_ends_at: endIso,
        trail_id: seriesName.trim() ? null : trail?.id ?? null,
        series_name: trail ? null : seriesName.trim() || null,
        collab_title: collabTitle.trim() || null,
        collab_description: collabDescription.trim() || null,
        is_meta: isMeta,
        parent_puzzle_id: !isMeta && parentId ? parentId : null,
        parent_cell_index: !isMeta && parentId && parentCell !== "" ? Number(parentCell) : null,
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

  // 격자는 저장된 값 그대로 표시 — "쉬움(4×4)로 변경" 버튼으로만 바꿀 수 있음.
  // 플레이 데이터(조각/공개/완성/티어/참여)가 있으면 서버가 거부함.
  const gridRows = puzzle.grid_rows;
  const gridCols = puzzle.grid_cols;
  const gridPieces = gridRows * gridCols;

  const changeGridTo = async (rows: number, cols: number) => {
    if (
      !confirm(
        `격자를 ${rows}×${cols} (${rows * cols}조각)으로 변경할까요? 플레이 데이터가 있으면 거부돼요.`
      )
    ) {
      return;
    }
    setError(null);
    setMsg(null);
    setChangingGrid(true);
    try {
      const res = await fetch(`/api/admin/puzzles/${puzzle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grid_rows: rows,
          grid_cols: cols,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? `격자 변경 실패 (${res.status})`);
        return;
      }
      setMsg(
        `격자 변경 완료 (${rows}×${cols}·${rows * cols}조각)`
      );
      startTransition(() => router.refresh());
    } catch {
      setError("네트워크 오류");
    } finally {
      setChangingGrid(false);
    }
  };
  const changeGridToDefault = () => changeGridTo(PUZZLE_GRID_ROWS, PUZZLE_GRID_COLS);

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
                />
              ) : (
                <span className="text-gray-600 text-xs">이미지 없음</span>
              )}
              {uploading ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              ) : null}
              {/* 격자 오버레이 — 저장된 격자 그대로 */}
              {currentImageUrl ? (
                <div
                  className="absolute inset-0 grid pointer-events-none"
                  style={{
                    gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  }}
                >
                  {Array.from({ length: gridPieces }).map((_, i) => (
                    <div key={i} className="border border-white/10" />
                  ))}
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
              {gridRows} × {gridCols}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">총 조각</span>
            <span className="text-white font-mono">{gridPieces}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">난이도</span>
            <span className="text-white font-mono">
              {difficulty} · 씨앗 ×{TIER_SEED_MULTIPLIER[difficulty]} · 물{" "}
              {TIER_BOTTLES[difficulty]}
            </span>
          </div>
          {!(gridRows === PUZZLE_GRID_ROWS && gridCols === PUZZLE_GRID_COLS) ? (
            <button
              type="button"
              onClick={changeGridToDefault}
              disabled={changingGrid}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-medium disabled:opacity-50"
            >
              {changingGrid ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Grid3x3 className="h-3.5 w-3.5" />
              )}
              쉬움 ({PUZZLE_GRID_ROWS}×{PUZZLE_GRID_COLS}·{PUZZLE_GRID_PIECES}조각)으로 변경
            </button>
          ) : (
            <p className="text-[10px] text-emerald-400/70 pt-1 border-t border-white/5">
              ✓ 기본 격자({PUZZLE_GRID_ROWS}×{PUZZLE_GRID_COLS}) 입니다.
            </p>
          )}
          {isMeta && !(gridRows === 3 && gridCols === 3) && (
            <button
              type="button"
              onClick={() => void changeGridTo(3, 3)}
              disabled={changingGrid}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-200 text-xs font-medium disabled:opacity-50"
            >
              {changingGrid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Grid3x3 className="h-3.5 w-3.5" />}
              메타용 3×3 (9조각)으로 변경
            </button>
          )}
          <p className="text-[10px] text-gray-600 leading-relaxed">
            플레이 데이터(조각·공개·완성·참여)가 있는 퍼즐은 격자 변경이 거부돼요.
            신규 퍼즐은 {PUZZLE_GRID_ROWS}×{PUZZLE_GRID_COLS} 고정.
          </p>
        </div>

        {/* 메타 퍼즐 / 상위 퍼즐 연결 (2026-10-16, 한라산둘레길 9구간 → 3×3) */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isMeta}
              onChange={(e) => {
                setIsMeta(e.target.checked);
                if (e.target.checked) {
                  setParentId("");
                  setParentCell("");
                }
              }}
              className="mt-0.5"
            />
            <span>
              <span className="text-white font-semibold">메타 퍼즐</span>
              <span className="block text-[11px] text-gray-500 leading-relaxed">
                씨앗 뽑기를 막고, 연결된 하위(구간) 퍼즐을 완성할 때마다 조각이 들어와요. 9구간이면 3×3 으로 두세요.
                완성하면 앱에 "리워드 받기"가 떠요(리워드 내용은 위 완성 보상 문구).
              </span>
            </span>
          </label>

          {!isMeta && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="text-gray-400">상위(메타) 퍼즐에 연결</div>
              <select
                value={parentId}
                onChange={(e) => {
                  setParentId(e.target.value);
                  setParentCell("");
                }}
                className="w-full h-9 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500/50"
              >
                <option value="">연결 안 함</option>
                {metaPuzzles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.grid_rows}×{m.grid_cols})
                  </option>
                ))}
              </select>
              {parentOpt && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 whitespace-nowrap">지급할 칸</span>
                  <select
                    value={parentCell}
                    onChange={(e) => setParentCell(e.target.value)}
                    className="h-9 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="">선택</option>
                    {Array.from({ length: parentCells }, (_, i) => (
                      <option key={i} value={String(i)}>
                        {i + 1}번 칸 ({Math.floor(i / parentOpt.grid_cols) + 1}행 {(i % parentOpt.grid_cols) + 1}열)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-[10px] text-gray-600 leading-relaxed">
                이 퍼즐을 완성한 사용자에게 상위 퍼즐의 그 칸 조각이 지급돼요. 구간 순서대로 1번 칸부터 두면 그림이 둘레길 순서로 채워져요.
                메타 퍼즐이 목록에 없으면 먼저 상위 퍼즐을 만들고 "메타 퍼즐"을 켜 저장하세요.
              </p>
            </div>
          )}
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

        {/* 난이도 — 운영자가 이미지를 보고 직접 선택 (완성 물병·필요 씨앗 배율 결정) */}
        <div>
          <div className="text-xs text-gray-400 mb-1.5">
            난이도 · 직접 선택 (완성 물병 + 필요 씨앗 배율)
          </div>
          <div className="grid grid-cols-4 gap-2">
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
                    ×{TIER_SEED_MULTIPLIER[opt.tier]} · 물 {TIER_BOTTLES[opt.tier]}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
            쉬움×1, 보통×2, 어려움×3, 도전×5 로 "완성에 필요한 씨앗" 을 배수화.
            코스 연결 퍼즐은 자연스레 N회 완주 느낌, standalone 퍼즐은 N배
            많은 씨앗을 모아야 완성. (실제 분배 적용은 Phase B 서버 트리거 반영 후)
          </p>
        </div>

        {/* 이벤트 기간 — 인증(콜라보) 씨앗 부스트 유효 구간. 비우면 상시 */}
        <div>
          <div className="text-xs text-gray-400 mb-1.5">
            이벤트 기간 (비우면 상시) · 기간 밖이면 씨앗 부스트·자동 참여 정지
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
