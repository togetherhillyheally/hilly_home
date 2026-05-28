"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Loader2 } from "lucide-react";

import type { Question, Survey } from "@/lib/survey-parser";
import { submitSurveyResponse, type SurveyAnswers } from "@/lib/supabase";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  survey: Survey;
  slug: string;
};

export default function SurveyClient({ survey, slug }: Props) {
  const allQuestions = useMemo(
    () => survey.sections.flatMap((s) => s.questions),
    [survey]
  );

  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = Object.values(answers).filter(
    (v) => v !== null && v !== undefined && v !== ""
  ).length;
  const progress =
    allQuestions.length === 0
      ? 0
      : Math.round((answeredCount / allQuestions.length) * 100);

  function setAnswer(id: string, value: string | number | null) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function onSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitSurveyResponse({
        surveySlug: slug,
        answers,
        meta: {
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
          locale:
            typeof navigator !== "undefined" ? navigator.language : null,
          answered_count: answeredCount,
          total_questions: allQuestions.length,
        },
      });
      setSubmitted(true);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#08080f] text-gray-100">
      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.10),transparent_65%)]" />
        <div className="absolute top-10 right-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#08080f]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/home_logo.png"
              alt="Hillyheally"
              width={72}
              height={40}
              className="h-12 w-auto"
            />
          </Link>
          {!submitted && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 tabular-nums">
                {answeredCount}/{allQuestions.length}
              </span>
              <div className="w-24 sm:w-40 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-pink-500 transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-12 lg:py-16 max-w-3xl">
        {submitted ? (
          <SubmittedView />
        ) : (
          <>
            <div className="mb-12 text-center">
              <h1 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight">
                <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-pink-500 bg-clip-text text-transparent">
                  {survey.title}
                </span>
              </h1>
              <p className="text-sm text-gray-400">
                답변은 익명으로 저장됩니다. 편한 만큼만 답해주세요.
              </p>
            </div>

            <div className="space-y-10">
              {survey.sections.map((section) => (
                <section
                  key={section.number}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-6 lg:p-8"
                >
                  <h2 className="text-lg font-semibold mb-6 flex items-baseline gap-2">
                    <span className="text-orange-400 tabular-nums text-sm">
                      {section.number.padStart(2, "0")}
                    </span>
                    <span className="text-white">{section.title}</span>
                  </h2>

                  <div className="space-y-7">
                    {section.questions.map((q) => (
                      <QuestionField
                        key={q.id}
                        question={q}
                        value={answers[q.id] ?? null}
                        onChange={(v) => setAnswer(q.id, v)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-3">
              {error && (
                <p className="text-sm text-red-400 text-center" role="alert">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting || answeredCount === 0}
                className={cn(
                  "inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full font-medium text-sm",
                  "bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg shadow-orange-500/20",
                  "transition-all hover:scale-[1.02] hover:shadow-orange-500/30",
                  "disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                )}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "제출 중…" : "응답 제출하기"}
              </button>
              <p className="text-xs text-gray-500">
                답변한 항목만 저장돼요 ({answeredCount}/{allQuestions.length})
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SubmittedView() {
  return (
    <div className="py-20 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-400/20 to-pink-500/20 border border-orange-400/30 mb-6">
        <CheckCircle2 className="h-8 w-8 text-orange-300" />
      </div>
      <h1 className="text-3xl lg:text-4xl font-bold mb-4">
        <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-pink-500 bg-clip-text text-transparent">
          응답 감사합니다
        </span>
      </h1>
      <p className="text-gray-400 mb-10">
        소중한 피드백을 잘 받았습니다. 더 좋은 힐리힐리로 보답할게요.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium border border-white/10 hover:border-orange-400/40 hover:text-orange-300 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | number | null;
  onChange: (v: string | number | null) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-200 leading-relaxed mb-3">
        {question.text}
      </label>
      {question.type === "scale" && (
        <ScaleField question={question} value={value} onChange={onChange} />
      )}
      {question.type === "choice" && (
        <ChoiceField question={question} value={value} onChange={onChange} />
      )}
      {question.type === "text" && (
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="자유롭게 적어주세요"
          className="bg-white/[0.03] border-white/10 text-gray-100 placeholder:text-gray-600 focus-visible:ring-orange-400/40"
        />
      )}
    </div>
  );
}

function ScaleField({
  question,
  value,
  onChange,
}: {
  question: Extract<Question, { type: "scale" }>;
  value: string | number | null;
  onChange: (v: number | null) => void;
}) {
  const items = [];
  for (let i = question.min; i <= question.max; i++) items.push(i);
  const selected = typeof value === "number" ? value : null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.map((n) => {
          const active = selected === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? null : n)}
              className={cn(
                "min-w-[40px] h-10 px-3 rounded-lg text-sm font-medium tabular-nums transition-all",
                "border",
                active
                  ? "bg-gradient-to-r from-orange-400 to-pink-500 text-white border-transparent shadow-md shadow-orange-500/20"
                  : "bg-white/[0.03] border-white/10 text-gray-300 hover:border-orange-400/40 hover:text-white"
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      {(question.minLabel || question.maxLabel) && (
        <div className="flex justify-between text-[11px] text-gray-500 mt-2 px-1">
          <span>{question.minLabel ?? ""}</span>
          <span>{question.maxLabel ?? ""}</span>
        </div>
      )}
    </div>
  );
}

function ChoiceField({
  question,
  value,
  onChange,
}: {
  question: Extract<Question, { type: "choice" }>;
  value: string | number | null;
  onChange: (v: string | null) => void;
}) {
  const selected = typeof value === "string" ? value : null;
  return (
    <div className="flex flex-wrap gap-2">
      {question.options.map((opt) => {
        const active = selected === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(active ? null : opt)}
            className={cn(
              "px-4 h-10 rounded-lg text-sm font-medium transition-all border",
              active
                ? "bg-gradient-to-r from-orange-400 to-pink-500 text-white border-transparent shadow-md shadow-orange-500/20"
                : "bg-white/[0.03] border-white/10 text-gray-300 hover:border-orange-400/40 hover:text-white"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
