"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HelpCircle,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  MapPin,
  Loader2,
  AlertCircle,
  Crosshair,
} from "lucide-react";
import TrailMapPreview, {
  type LatLng,
} from "@/components/admin/TrailMapPreview";

type Coord = [number, number] | [number, number, number];
type Coordinates = Coord[] | Coord[][];

type Quiz = {
  id: string;
  seq: number;
  lat: number;
  lng: number;
  radius_m: number;
  question: string;
  choices: string[];
  answer_index: number;
  hint: string | null;
  explanation: string | null;
  image_url: string | null;
  is_active: boolean;
};

type Props = {
  trailId: string;
  coordinates: Coordinates | null;
  bounds:
    | { minLat: number; maxLat: number; minLon: number; maxLon: number }
    | null;
};

type Draft = {
  id: string | null; // null = 신규
  question: string;
  choices: string[];
  answer_index: number;
  hint: string;
  explanation: string;
  image_url: string;
  radius_m: number;
  is_active: boolean;
  lat: number | null;
  lng: number | null;
};

const EMPTY_DRAFT: Draft = {
  id: null,
  question: "",
  choices: ["", ""],
  answer_index: 0,
  hint: "",
  explanation: "",
  image_url: "",
  radius_m: 25,
  is_active: true,
  lat: null,
  lng: null,
};

function toDraft(q: Quiz): Draft {
  return {
    id: q.id,
    question: q.question,
    choices: q.choices.length ? q.choices : ["", ""],
    answer_index: q.answer_index,
    hint: q.hint ?? "",
    explanation: q.explanation ?? "",
    image_url: q.image_url ?? "",
    radius_m: q.radius_m,
    is_active: q.is_active,
    lat: q.lat,
    lng: q.lng,
  };
}

export default function QuizPanel({ trailId, coordinates, bounds }: Props) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trails/${trailId}/quizzes`);
      const data = await res.json();
      if (res.ok) setQuizzes(data.quizzes ?? []);
      else setError(data.error ?? "불러오기 실패");
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, [trailId]);

  useEffect(() => {
    void load();
  }, [load]);

  const startNew = () => {
    setError(null);
    setMsg(null);
    setDraft({ ...EMPTY_DRAFT, choices: ["", ""] });
  };
  const startEdit = (q: Quiz) => {
    setError(null);
    setMsg(null);
    setDraft(toDraft(q));
  };
  const cancel = () => {
    setDraft(null);
    setError(null);
  };

  const patchDraft = (p: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const onMapClick = (pt: LatLng) => {
    if (!draft) return;
    patchDraft({ lat: pt.lat, lng: pt.lng });
  };

  const setChoice = (i: number, v: string) =>
    setDraft((d) => {
      if (!d) return d;
      const choices = d.choices.slice();
      choices[i] = v;
      return { ...d, choices };
    });
  const addChoice = () =>
    setDraft((d) =>
      d && d.choices.length < 6 ? { ...d, choices: [...d.choices, ""] } : d
    );
  const removeChoice = (i: number) =>
    setDraft((d) => {
      if (!d || d.choices.length <= 2) return d;
      const choices = d.choices.filter((_, j) => j !== i);
      const answer_index =
        d.answer_index === i
          ? 0
          : d.answer_index > i
            ? d.answer_index - 1
            : d.answer_index;
      return { ...d, choices, answer_index };
    });

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const isEdit = !!draft.id;
      const res = await fetch(`/api/admin/trails/${trailId}/quizzes`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id ?? undefined,
          question: draft.question,
          choices: draft.choices,
          answer_index: draft.answer_index,
          hint: draft.hint,
          explanation: draft.explanation,
          image_url: draft.image_url,
          radius_m: draft.radius_m,
          is_active: draft.is_active,
          lat: draft.lat,
          lng: draft.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장 실패");
        return;
      }
      setMsg(isEdit ? "수정했어요." : "퀴즈를 추가했어요.");
      setDraft(null);
      await load();
    } catch {
      setError("네트워크 오류");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (q: Quiz) => {
    if (!confirm(`"${q.question.slice(0, 20)}…" 퀴즈를 삭제할까요?`)) return;
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/trails/${trailId}/quizzes?quizId=${q.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "삭제 실패");
        return;
      }
      setMsg("삭제했어요.");
      if (draft?.id === q.id) setDraft(null);
      await load();
    } catch {
      setError("네트워크 오류");
    }
  };

  const hasRoute = !!coordinates && coordinates.length > 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">코스 퀴즈</h3>
          <span className="text-xs text-gray-500">({quizzes.length}개)</span>
        </div>
        {!draft && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-medium hover:bg-sky-500/25 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            퀴즈 추가
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
        경로 위 지점에 교육 퀴즈를 배치해요. 사용자가 그 지점 반경 안에 도착하면
        퀴즈가 열리고, 오답이면 힌트와 함께 다시 풀 수 있어요. 정답 · 힌트 · 해설은
        앱에 노출되지 않아요(정답 검증은 서버).
      </p>

      {error && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
      {msg && !error && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          <Check className="h-3.5 w-3.5 shrink-0" />
          {msg}
        </div>
      )}

      {/* 편집 폼 */}
      {draft && (
        <div className="mb-5 rounded-xl border border-sky-500/20 bg-sky-500/[0.03] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-300">
              {draft.id ? "퀴즈 수정" : "새 퀴즈"}
            </span>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => patchDraft({ is_active: e.target.checked })}
                className="accent-emerald-500"
              />
              활성
            </label>
          </div>

          {/* 질문 */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">질문</label>
            <textarea
              value={draft.question}
              onChange={(e) => patchDraft({ question: e.target.value })}
              rows={2}
              placeholder="예) 이 성곽은 조선 어느 왕 때 처음 쌓았을까요?"
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-sky-500/50 focus:outline-none resize-none"
            />
          </div>

          {/* 보기 + 정답 선택 */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">
              보기 (라디오로 정답 선택)
            </label>
            <div className="space-y-2">
              {draft.choices.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="answer"
                    checked={draft.answer_index === i}
                    onChange={() => patchDraft({ answer_index: i })}
                    className="accent-emerald-500 shrink-0"
                    title="정답으로 지정"
                  />
                  <span className="text-[11px] text-gray-500 w-4 shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={c}
                    onChange={(e) => setChoice(i, e.target.value)}
                    placeholder={`보기 ${i + 1}`}
                    className="flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-sky-500/50 focus:outline-none"
                  />
                  <button
                    onClick={() => removeChoice(i)}
                    disabled={draft.choices.length <= 2}
                    className="p-1.5 rounded text-gray-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-gray-500"
                    title="보기 삭제"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {draft.choices.length < 6 && (
              <button
                onClick={addChoice}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
              >
                <Plus className="h-3 w-3" /> 보기 추가
              </button>
            )}
          </div>

          {/* 힌트 / 해설 */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                힌트 <span className="text-gray-600">(오답 시 노출)</span>
              </label>
              <input
                value={draft.hint}
                onChange={(e) => patchDraft({ hint: e.target.value })}
                placeholder="예) 조선을 세운 왕을 떠올려 보세요."
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-sky-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                해설 <span className="text-gray-600">(정답 시 노출)</span>
              </label>
              <textarea
                value={draft.explanation}
                onChange={(e) => patchDraft({ explanation: e.target.value })}
                rows={2}
                placeholder="이 지점의 역사적 배경을 알려주는 짧은 설명"
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-sky-500/50 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                이미지 URL <span className="text-gray-600">(선택)</span>
              </label>
              <input
                value={draft.image_url}
                onChange={(e) => patchDraft({ image_url: e.target.value })}
                placeholder="https://…"
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-sky-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* 위치 + 반경 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-gray-400 flex items-center gap-1">
                <Crosshair className="h-3 w-3" />
                위치 — 지도를 클릭해 찍어주세요
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                반경
                <input
                  type="number"
                  value={draft.radius_m}
                  onChange={(e) =>
                    patchDraft({ radius_m: Number(e.target.value) })
                  }
                  min={5}
                  max={200}
                  className="w-16 rounded bg-black/30 border border-white/10 px-2 py-1 text-right text-white focus:border-sky-500/50 focus:outline-none"
                />
                m
              </div>
            </div>
            {draft.lat != null && draft.lng != null ? (
              <div className="text-[11px] font-mono text-emerald-300 mb-1.5">
                {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
              </div>
            ) : (
              <div className="text-[11px] text-amber-400 mb-1.5">
                아직 위치를 찍지 않았어요.
              </div>
            )}
            {hasRoute ? (
              <TrailMapPreview
                coordinates={coordinates as Coordinates}
                bounds={bounds ?? undefined}
                editMode="start"
                onMapClick={onMapClick}
                pendingPoint={
                  draft.lat != null && draft.lng != null
                    ? { lat: draft.lat, lng: draft.lng }
                    : null
                }
                height={280}
              />
            ) : (
              <div className="text-[11px] text-gray-500 rounded-lg border border-white/10 bg-black/20 px-3 py-4 text-center">
                이 코스에 경로 좌표가 없어 지도를 표시할 수 없어요. 위치 없이 저장할
                수 없어요.
              </div>
            )}
          </div>

          {/* 폼 액션 */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-sky-500 text-white text-sm font-medium hover:bg-sky-400 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {draft.id ? "수정 저장" : "추가"}
            </button>
            <button
              onClick={cancel}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-white/10 text-gray-300 text-sm hover:bg-white/[0.04] transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
        </div>
      ) : quizzes.length === 0 ? (
        !draft && (
          <div className="text-center py-8 text-sm text-gray-500">
            아직 배치한 퀴즈가 없어요.
          </div>
        )
      ) : (
        <ul className="space-y-2">
          {quizzes.map((q, i) => (
            <li
              key={q.id}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-sky-500/15 text-sky-300 text-[11px] font-mono font-semibold">
                      {i + 1}
                    </span>
                    {!q.is_active && (
                      <span className="text-[10px] text-gray-500 border border-white/10 rounded px-1">
                        비활성
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 font-mono flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {q.lat.toFixed(4)}, {q.lng.toFixed(4)} · {q.radius_m}m
                    </span>
                  </div>
                  <p className="text-sm text-white truncate">{q.question}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                    정답: {q.choices[q.answer_index] ?? "—"}
                    {q.choices.length > 0 && ` · 보기 ${q.choices.length}개`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(q)}
                    className="p-1.5 rounded text-gray-400 hover:text-sky-300 hover:bg-white/[0.04]"
                    title="수정"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(q)}
                    className="p-1.5 rounded text-gray-400 hover:text-rose-400 hover:bg-white/[0.04]"
                    title="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
