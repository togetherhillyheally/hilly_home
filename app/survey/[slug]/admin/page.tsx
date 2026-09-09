import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from "next/link";

import { parseSurvey, type Question, type Section } from "@/lib/survey-parser";
import {
  fetchSurveyResponses,
  fetchSurveyStatus,
  type SurveyResponseRow,
} from "@/lib/supabase";
import SurveyAdminTabs from "./SurveyAdminTabs";
import CloseToggle from "./CloseToggle";

const SURVEY_DIR = path.join(process.cwd(), "surveys");

export const dynamic = "force-dynamic";

export const metadata = {
  title: "설문 응답 모아보기 | Hilly Heally",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ key?: string }>;

export default async function SurveyAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { key } = await searchParams;

  const adminKey = process.env.SURVEY_ADMIN_KEY;
  if (!adminKey || !key || key !== adminKey) {
    notFound();
  }

  const filePath = path.join(SURVEY_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) notFound();
  const md = fs.readFileSync(filePath, "utf-8");
  const survey = parseSurvey(md);

  let responses: SurveyResponseRow[] = [];
  let fetchError: string | null = null;
  try {
    responses = await fetchSurveyResponses(slug);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "응답 조회 실패";
  }
  const status = await fetchSurveyStatus(slug);

  const lastAt = responses[0]?.submitted_at;
  const allQuestions = survey.sections.flatMap((s) => s.questions);

  return (
    <div className="min-h-screen bg-[#08080f] text-gray-100">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.08),transparent_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <header className="sticky top-0 z-50 bg-[#08080f]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href={`/survey/${slug}?key=${encodeURIComponent(key)}`}
            className="text-xs text-gray-400 hover:text-orange-300"
          >
            ← 응답 화면 미리보기
          </Link>
          <div className="text-xs text-gray-500">
            관리자 페이지 · 검색엔진 비공개
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-pink-500 bg-clip-text text-transparent">
                {survey.title}
              </span>{" "}
              <span className="text-gray-400 text-base">응답 모아보기</span>
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <Stat label="총 응답" value={`${responses.length}건`} />
              <Stat label="총 문항" value={`${allQuestions.length}개`} />
              <Stat
                label="마지막 응답"
                value={lastAt ? formatDateTime(lastAt) : "-"}
              />
            </div>
          </div>
          <CloseToggle
            slug={slug}
            adminKey={key}
            initialIsClosed={status?.is_closed ?? false}
            initialReason={status?.closed_reason ?? null}
          />
        </div>

        {fetchError && (
          <div className="mb-8 rounded-xl border border-red-400/30 bg-red-500/5 p-4 text-sm text-red-300">
            {fetchError}
          </div>
        )}

        {responses.length === 0 && !fetchError ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center text-gray-400">
            아직 응답이 없습니다.
          </div>
        ) : (
          <SurveyAdminTabs
            cardCount={responses.length}
            cards={
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {responses.map((r, i) => (
                  <ResponseCard
                    key={r.id ?? i}
                    index={i + 1}
                    response={r}
                    sections={survey.sections}
                  />
                ))}
              </div>
            }
            stats={
              <div className="space-y-8">
                {survey.sections.map((section) => (
                  <SectionBlock
                    key={section.number}
                    section={section}
                    responses={responses}
                  />
                ))}
              </div>
            }
          />
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-baseline gap-1.5">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-100 font-medium">{value}</span>
    </div>
  );
}

/**
 * 응답 카드 — 한 지원자의 전체 응답을 한 카드에서 확인.
 * 첫 질문(보통 이름) 은 헤더에 크게 강조.
 */
function ResponseCard({
  index,
  response,
  sections,
}: {
  index: number;
  response: SurveyResponseRow;
  sections: Section[];
}) {
  const allQuestions = sections.flatMap((s) => s.questions);
  const nameQ = allQuestions[0];
  const nameValue = nameQ ? response.answers?.[nameQ.id] : null;
  const nameStr =
    nameValue == null || nameValue === "" ? "(이름 미기입)" : String(nameValue);
  const restQuestions = allQuestions.slice(1);

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <header className="px-5 py-3 border-b border-white/5 bg-white/[0.02] flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[11px] font-mono text-gray-500 tabular-nums">
            #{index}
          </span>
          <h3 className="text-base font-bold text-white truncate">
            {nameStr}
          </h3>
        </div>
        <span className="text-[11px] text-gray-500 tabular-nums shrink-0">
          {formatDateTime(response.submitted_at)}
        </span>
      </header>
      <dl className="px-5 py-4 grid grid-cols-1 sm:grid-cols-[minmax(100px,140px)_1fr] gap-x-4 gap-y-2.5">
        {restQuestions.map((q) => {
          const v = response.answers?.[q.id];
          const display =
            v === null || v === undefined || v === "" ? null : String(v);
          return (
            <div key={q.id} className="contents">
              <dt className="text-xs text-gray-400 pt-0.5 sm:pt-1">
                {q.text}
              </dt>
              <dd className="text-sm text-gray-100 break-words whitespace-pre-wrap">
                {display ?? <span className="text-gray-600">—</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function SectionBlock({
  section,
  responses,
}: {
  section: Section;
  responses: SurveyResponseRow[];
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 lg:p-8">
      <h2 className="text-lg font-semibold mb-6 flex items-baseline gap-2">
        <span className="text-orange-400 tabular-nums text-sm">
          {section.number.padStart(2, "0")}
        </span>
        <span className="text-white">{section.title}</span>
      </h2>
      <div className="space-y-8">
        {section.questions.map((q) => (
          <QuestionStats key={q.id} question={q} responses={responses} />
        ))}
      </div>
    </section>
  );
}

function QuestionStats({
  question,
  responses,
}: {
  question: Question;
  responses: SurveyResponseRow[];
}) {
  const values = responses
    .map((r) => r.answers?.[question.id])
    .filter((v) => v !== null && v !== undefined && v !== "");
  const answeredCount = values.length;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="text-sm text-gray-200 leading-relaxed">{question.text}</p>
        <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">
          {answeredCount}/{responses.length} 응답
        </span>
      </div>

      {question.type === "scale" && (
        <ScaleStats question={question} values={values as number[]} />
      )}
      {question.type === "choice" && (
        <ChoiceStats
          question={question}
          values={values as string[]}
          total={answeredCount}
        />
      )}
      {question.type === "text" && (
        <TextStats values={values as string[]} />
      )}
    </div>
  );
}

function ScaleStats({
  question,
  values,
}: {
  question: Extract<Question, { type: "scale" }>;
  values: number[];
}) {
  const nums = values.filter((v): v is number => typeof v === "number");
  const buckets: number[] = [];
  for (let i = question.min; i <= question.max; i++) buckets.push(0);
  for (const v of nums) {
    const idx = v - question.min;
    if (idx >= 0 && idx < buckets.length) buckets[idx]++;
  }
  const max = Math.max(1, ...buckets);
  const avg =
    nums.length === 0
      ? null
      : nums.reduce((a, b) => a + b, 0) / nums.length;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-2xl font-semibold tabular-nums">
          {avg === null ? "-" : avg.toFixed(2)}
        </span>
        <span className="text-xs text-gray-500">
          평균 ({question.min}~{question.max})
        </span>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1 items-center">
        {buckets.map((count, idx) => {
          const n = question.min + idx;
          const pct = (count / max) * 100;
          return (
            <div key={n} className="contents">
              <span className="text-xs text-gray-400 tabular-nums w-6 text-right">
                {n}
              </span>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-pink-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 tabular-nums w-10 text-right">
                {count}
              </span>
            </div>
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

function ChoiceStats({
  question,
  values,
  total,
}: {
  question: Extract<Question, { type: "choice" }>;
  values: string[];
  total: number;
}) {
  const counts = new Map<string, number>(
    question.options.map((opt) => [opt, 0])
  );
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const max = Math.max(1, ...Array.from(counts.values()));

  return (
    <div className="grid grid-cols-[minmax(80px,140px)_1fr_auto] gap-x-3 gap-y-1.5 items-center">
      {question.options.map((opt) => {
        const count = counts.get(opt) ?? 0;
        const pct = (count / max) * 100;
        const ratio = total === 0 ? 0 : Math.round((count / total) * 100);
        return (
          <div key={opt} className="contents">
            <span className="text-xs text-gray-300 truncate">{opt}</span>
            <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-pink-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 tabular-nums w-16 text-right">
              {count} · {ratio}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TextStats({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <p className="text-xs text-gray-600 italic">응답 없음</p>;
  }
  return (
    <ul className="space-y-1.5">
      {values.map((v, i) => (
        <li
          key={i}
          className="text-sm text-gray-200 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 whitespace-pre-wrap break-words"
        >
          {v}
        </li>
      ))}
    </ul>
  );
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
