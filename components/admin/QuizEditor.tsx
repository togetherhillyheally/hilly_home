"use client";

/**
 * 포인트(스탬프/체크포인트) 객관식 퀴즈 편집기 — 관리자 다크 테마.
 * 도착 반경(radius_m)도 함께 편집한다 (없으면 앱 기본 10m).
 *
 * value.quiz === null 이면 퀴즈 미설정, 객체면 활성.
 * onChange 로 항상 완결형 패치를 넘긴다 (검증은 부모에서 저장 직전에 실행).
 */

import { CircleCheck, Plus, X } from "lucide-react";

export interface QuizDraft {
  question: string;
  choices: string[];
  answerIndex: number;
}

export interface QuizEditorValue {
  quiz: QuizDraft | null;
  radiusM: number | null;
}

const MIN_CHOICES = 2;
const MAX_CHOICES = 4;
const RADIUS_MIN = 5;
const RADIUS_MAX = 500;
const RADIUS_DEFAULT = 10;

export function emptyQuiz(): QuizDraft {
  return { question: "", choices: ["", ""], answerIndex: 0 };
}

/** 저장 가능 여부 — 질문·모든 선택지 non-empty + answerIndex 범위 */
export function isQuizComplete(q: QuizDraft): boolean {
  return (
    q.question.trim().length > 0 &&
    q.choices.length >= MIN_CHOICES &&
    q.choices.length <= MAX_CHOICES &&
    q.choices.every((c) => c.trim().length > 0) &&
    q.answerIndex >= 0 &&
    q.answerIndex < q.choices.length
  );
}

type Props = {
  value: QuizEditorValue;
  onChange: (v: QuizEditorValue) => void;
  disabled?: boolean;
};

export default function QuizEditor({ value, onChange, disabled }: Props) {
  const quiz = value.quiz;
  const radiusVal = value.radiusM ?? RADIUS_DEFAULT;

  const setQuiz = (next: QuizDraft | null) =>
    onChange({ ...value, quiz: next });
  const setRadius = (next: number | null) =>
    onChange({ ...value, radiusM: next });

  return (
    <div className="space-y-4">
      {/* 도착 반경 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
            도착 반경
          </label>
          <span className="text-[11px] text-gray-500 font-mono">
            {value.radiusM == null ? `${RADIUS_DEFAULT}m (기본)` : `${value.radiusM}m`}
          </span>
        </div>
        <input
          type="range"
          min={RADIUS_MIN}
          max={RADIUS_MAX}
          step={5}
          value={radiusVal}
          disabled={disabled}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>{RADIUS_MIN}m</span>
          <button
            type="button"
            onClick={() => setRadius(null)}
            disabled={disabled || value.radiusM == null}
            className="underline decoration-dotted hover:text-gray-300 disabled:opacity-40"
          >
            기본값(10m)으로
          </button>
          <span>{RADIUS_MAX}m</span>
        </div>
      </div>

      {/* 퀴즈 토글 + 편집 */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
            객관식 퀴즈
          </label>
          <QuizSwitch
            checked={quiz != null}
            disabled={disabled}
            onChange={(on) => setQuiz(on ? emptyQuiz() : null)}
          />
        </div>

        {quiz && (
          <div className="space-y-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <input
              type="text"
              value={quiz.question}
              onChange={(e) => setQuiz({ ...quiz, question: e.target.value })}
              placeholder="질문 (예: 이 정자의 이름은?)"
              disabled={disabled}
              className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
            />

            <div className="space-y-1.5">
              {quiz.choices.map((choice, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    title="정답으로 선택"
                    disabled={disabled}
                    onClick={() => setQuiz({ ...quiz, answerIndex: i })}
                    className={
                      quiz.answerIndex === i
                        ? "text-emerald-400 flex-shrink-0"
                        : "text-gray-600 hover:text-gray-400 flex-shrink-0"
                    }
                  >
                    <CircleCheck className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) => {
                      const choices = [...quiz.choices];
                      choices[i] = e.target.value;
                      setQuiz({ ...quiz, choices });
                    }}
                    placeholder={`선택지 ${i + 1}`}
                    disabled={disabled}
                    className="flex-1 h-8 px-2 rounded-md bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
                  />
                  {quiz.choices.length > MIN_CHOICES && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const choices = quiz.choices.filter((_, j) => j !== i);
                        const answerIndex =
                          quiz.answerIndex === i
                            ? 0
                            : quiz.answerIndex > i
                              ? quiz.answerIndex - 1
                              : quiz.answerIndex;
                        setQuiz({ ...quiz, choices, answerIndex });
                      }}
                      className="text-gray-500 hover:text-red-400 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {quiz.choices.length < MAX_CHOICES && (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  setQuiz({ ...quiz, choices: [...quiz.choices, ""] })
                }
                className="h-7 px-2.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white text-[11px] inline-flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> 선택지 추가
              </button>
            )}

            <p className="text-[10px] text-gray-500 leading-relaxed">
              초록 체크가 정답이에요. 앱에서 도착 시 퀴즈가 표시됩니다.
              <br />
              <span className="text-amber-300/80">
                주의: 정답 인덱스는 클라이언트에 노출됩니다(v1).
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 ${
        checked ? "bg-orange-500" : "bg-white/[0.08]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
