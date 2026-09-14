import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { parseSurvey, type Question, type Survey } from "@/lib/survey-parser";
import {
  fetchSurveyResponses,
  type SurveyResponseRow,
} from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SURVEY_DIR = path.join(process.cwd(), "surveys");

/** 설문 응답을 단일 HTML 파일로 내보내기 (공유용). */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const adminKey = process.env.SURVEY_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { error: "SURVEY_ADMIN_KEY 미설정" },
      { status: 500 }
    );
  }
  const url = new URL(req.url);
  const providedKey = url.searchParams.get("key") ?? "";
  if (providedKey !== adminKey) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const filePath = path.join(SURVEY_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "설문 없음" }, { status: 404 });
  }
  const md = fs.readFileSync(filePath, "utf-8");
  const survey = parseSurvey(md);
  const responses = await fetchSurveyResponses(slug);

  const html = renderHtml(survey, responses, slug);
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-responses.html"`,
    },
  });
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderHtml(
  survey: Survey,
  responses: SurveyResponseRow[],
  slug: string
): string {
  const allQuestions: Question[] = survey.sections.flatMap((s) => s.questions);
  const exportedAt = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });

  const cardsHtml = responses
    .map((r, idx) => {
      const nameQ = allQuestions[0];
      const nameVal =
        (nameQ && r.answers?.[nameQ.id]) || "(이름 미기입)";
      const rows = allQuestions
        .slice(1)
        .map((q) => {
          const v = r.answers?.[q.id];
          const display =
            v === null || v === undefined || v === ""
              ? '<span style="color:#9ca3af">—</span>'
              : escape(String(v));
          return `<tr>
            <th>${escape(q.text)}</th>
            <td>${display}</td>
          </tr>`;
        })
        .join("");
      return `<section class="card">
        <header class="card-h">
          <span class="idx">#${idx + 1}</span>
          <h3>${escape(String(nameVal))}</h3>
          <span class="ts">${formatDate(r.submitted_at)}</span>
        </header>
        <table><tbody>${rows}</tbody></table>
      </section>`;
    })
    .join("\n");

  const statsHtml = survey.sections
    .map((sec) => {
      const items = sec.questions
        .map((q) => {
          const vals = responses
            .map((r) => r.answers?.[q.id])
            .filter((v) => v !== null && v !== undefined && v !== "");
          const count = vals.length;
          if (q.type === "choice") {
            const buckets = new Map<string, number>();
            for (const opt of q.options) buckets.set(opt, 0);
            for (const v of vals as string[])
              buckets.set(String(v), (buckets.get(String(v)) ?? 0) + 1);
            const max = Math.max(1, ...Array.from(buckets.values()));
            const bars = q.options
              .map((opt) => {
                const c = buckets.get(opt) ?? 0;
                const pct = (c / max) * 100;
                const ratio =
                  count === 0 ? 0 : Math.round((c / count) * 100);
                return `<div class="bar-row">
                  <span class="bar-lbl">${escape(opt)}</span>
                  <div class="bar-bg"><div class="bar-fg" style="width:${pct}%"></div></div>
                  <span class="bar-n">${c} · ${ratio}%</span>
                </div>`;
              })
              .join("");
            return `<div class="q">
              <div class="q-h">${escape(q.text)} <span class="q-n">${count}/${responses.length}</span></div>
              ${bars}
            </div>`;
          }
          if (q.type === "scale") {
            const nums = (vals as number[]).filter(
              (v): v is number => typeof v === "number"
            );
            const avg = nums.length
              ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)
              : "-";
            return `<div class="q">
              <div class="q-h">${escape(q.text)} <span class="q-n">${count}/${responses.length}</span></div>
              <div class="avg">평균 <b>${avg}</b> (${q.min}~${q.max})</div>
            </div>`;
          }
          // text
          const list = (vals as string[])
            .map(
              (v) =>
                `<li>${escape(String(v)).replace(/\n/g, "<br>")}</li>`
            )
            .join("");
          return `<div class="q">
            <div class="q-h">${escape(q.text)} <span class="q-n">${count}/${responses.length}</span></div>
            ${list ? `<ul class="text-list">${list}</ul>` : '<p class="empty">응답 없음</p>'}
          </div>`;
        })
        .join("");
      return `<section class="stats-sec">
        <h3>${sec.number}. ${escape(sec.title)}</h3>
        ${items}
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${escape(survey.title)} · 응답 모아보기</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; background: #f9fafb; color: #111827; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 32px 20px 60px; }
  h1 { margin: 0 0 6px; font-size: 22px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 6px; }
  .stat { display: inline-block; margin-right: 16px; font-size: 13px; }
  .stat b { color: #111827; }
  .divider { border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  h2 { font-size: 18px; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #111827; }

  .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 720px) { .grid { grid-template-columns: 1fr 1fr; } }

  .card { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff; break-inside: avoid; }
  .card-h { display: flex; align-items: baseline; gap: 8px; padding: 10px 14px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; }
  .card-h .idx { font-family: monospace; color: #6b7280; font-size: 12px; }
  .card-h h3 { flex: 1; margin: 0; font-size: 15px; }
  .card-h .ts { color: #6b7280; font-size: 11px; }
  .card table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .card th, .card td { padding: 6px 14px; vertical-align: top; text-align: left; }
  .card th { color: #6b7280; font-weight: 500; width: 30%; }
  .card td { color: #111827; white-space: pre-wrap; word-break: break-word; }
  .card tr + tr th, .card tr + tr td { border-top: 1px solid #f3f4f6; }

  .stats-sec { margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
  .stats-sec h3 { margin: 0 0 12px; font-size: 15px; color: #111827; }
  .q { margin-bottom: 16px; }
  .q-h { font-size: 13px; color: #374151; margin-bottom: 6px; }
  .q-n { color: #9ca3af; font-size: 11px; margin-left: 4px; }
  .bar-row { display: grid; grid-template-columns: minmax(80px,140px) 1fr auto; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 3px; }
  .bar-lbl { color: #374151; }
  .bar-bg { height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
  .bar-fg { height: 100%; background: linear-gradient(90deg,#fb923c,#ec4899); }
  .bar-n { color: #6b7280; font-family: monospace; }
  .avg { font-size: 13px; color: #374151; }
  .text-list { margin: 4px 0 0; padding-left: 18px; font-size: 13px; }
  .text-list li { margin-bottom: 4px; color: #111827; }
  .empty { color: #9ca3af; font-size: 12px; margin: 2px 0 0; }

  footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 11px; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${escape(survey.title)}</h1>
    <p class="meta">slug: <code>${escape(slug)}</code> · 내보낸 시각: ${escape(exportedAt)}</p>
    <p class="meta">
      <span class="stat">총 응답 <b>${responses.length}건</b></span>
      <span class="stat">총 문항 <b>${allQuestions.length}개</b></span>
    </p>

    <hr class="divider">
    <h2>응답자 명단 (${responses.length}건)</h2>
    ${responses.length === 0 ? '<p style="color:#9ca3af">응답이 없습니다.</p>' : `<div class="grid">${cardsHtml}</div>`}

    <hr class="divider">
    <h2>문항별 통계</h2>
    ${statsHtml}

    <footer>Hilly Heally · 설문 응답 내보내기</footer>
  </div>
</body>
</html>`;
}
