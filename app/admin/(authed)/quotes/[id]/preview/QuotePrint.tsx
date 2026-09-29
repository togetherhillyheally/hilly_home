"use client";

import { Fragment } from "react";
import { Printer } from "lucide-react";
import {
  COMPANY_INFO,
  formatDateKo,
  formatKRW,
  grandTotal,
  sumQuote,
  sumSection,
  type QuoteRow,
} from "@/lib/quotes";

export default function QuotePrint({ quote }: { quote: QuoteRow }) {
  const raw = sumQuote(quote.sections ?? []).amount;
  const totalMM = sumQuote(quote.sections ?? []).manMonth;
  const gt = grandTotal(quote);
  const memoLines = (quote.memo ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-neutral-100 text-black">
      {/* 툴바 — 인쇄 시 숨김 */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-2 flex items-center justify-between">
        <div className="text-xs text-neutral-500 font-mono">
          {quote.quote_no ?? "-"} · 미리보기
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
        >
          <Printer className="h-4 w-4" />
          인쇄 · PDF 저장 (Cmd+P)
        </button>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          html,
          body {
            background: #fff !important;
          }
          .page-break {
            page-break-before: always;
          }
          /* 컬러 배경/그라디언트를 인쇄에도 그대로 */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* 서명 블록·표 행이 페이지 사이 잘리지 않도록 */
          .keep-together {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* ===== 페이지 1: 표지 ===== */}
      <section className="mx-auto max-w-[210mm] bg-white shadow-sm mb-4 print:mb-0 print:shadow-none overflow-hidden">
        <div
          className="relative text-white p-12 min-h-[720px] flex flex-col"
          style={{
            background:
              "linear-gradient(135deg, #0D1117 0%, #1a1420 55%, #2a1618 100%)",
          }}
        >
          {/* 브랜드 orange→pink 글로우 */}
          <div
            className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(236,72,153,0.18) 45%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
          {/* 상단 좌: 로고 + 회사명 */}
          <div className="relative flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home_logo.png"
              alt="Hillyheally"
              className="h-9 w-auto opacity-95"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="text-sm tracking-[0.24em] font-semibold text-white/70 uppercase">
              {COMPANY_INFO.name}
            </div>
          </div>

          {/* 중앙: 타이틀 */}
          <div className="relative flex-1 flex flex-col justify-center">
            <div className="text-[11px] tracking-[0.28em] font-semibold text-orange-300 mb-4 uppercase">
              Quotation · 견적서
            </div>
            <h1 className="text-5xl md:text-6xl font-black leading-[1.15] tracking-tight text-white">
              {quote.project_name}
            </h1>
            <div className="mt-8 h-[3px] w-24 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full" />
          </div>

          {/* 하단: 발주 정보 */}
          <div className="relative grid grid-cols-2 gap-x-8 gap-y-3 text-[13px] pt-6 border-t border-white/10">
            <InfoCell label="공급자" value={COMPANY_INFO.name} />
            <InfoCell label="견적일자" value={formatDateKo(quote.quote_date)} />
            <InfoCell label="대표자" value={COMPANY_INFO.ownerName} />
            <InfoCell label="사업자번호" value={COMPANY_INFO.bizNumber} mono />
            <InfoCell label="연락처" value={COMPANY_INFO.contact} mono />
            <InfoCell label="견적번호" value={quote.quote_no ?? "-"} mono />
          </div>
        </div>
      </section>

      {/* ===== 페이지 2: 상세 ===== */}
      <section className="page-break mx-auto max-w-[210mm] bg-white shadow-sm p-8 print:shadow-none">
        {quote.preface ? (
          <p className="text-[12px] text-neutral-700 mb-1">{quote.preface}</p>
        ) : null}
        <p className="text-[11px] text-neutral-600 text-right mb-2">
          (단위 : 원)
        </p>

        {/* 항목 표 */}
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-neutral-200 text-neutral-800">
              <th className="w-[60px] border border-neutral-400 px-2 py-2 text-center">
                구분
              </th>
              <th className="w-[80px] border border-neutral-400 px-2 py-2 text-center">
                담당자
              </th>
              <th className="border border-neutral-400 px-2 py-2 text-center">
                담당업무
              </th>
              <th className="w-[80px] border border-neutral-400 px-2 py-2 text-center">
                투입공수({quote.unit_label || "M/M"})
              </th>
              <th className="w-[110px] border border-neutral-400 px-2 py-2 text-center">
                금액
              </th>
              <th className="w-[110px] border border-neutral-400 px-2 py-2 text-center">
                공급가
              </th>
            </tr>
          </thead>
          <tbody>
            {(quote.sections ?? []).map((sec, sIdx) => {
              const rowspan = Math.max(1, sec.items.length);
              return (
                <Fragment key={sIdx}>
                  {sec.group_label ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="border border-neutral-400 bg-neutral-50 px-2 py-1.5 font-semibold text-[12px]"
                      >
                        {sec.group_label}
                      </td>
                    </tr>
                  ) : null}
                  {sec.items.length === 0 ? (
                    <tr>
                      <td className="border border-neutral-400 px-2 py-6 text-center align-middle bg-neutral-50 font-semibold">
                        {sec.category}
                      </td>
                      <td
                        colSpan={5}
                        className="border border-neutral-400 px-2 py-6 text-center text-neutral-400 text-xs"
                      >
                        항목이 없어요
                      </td>
                    </tr>
                  ) : (
                    sec.items.map((it, iIdx) => {
                      const line =
                        (Number(it.man_month) || 0) *
                        (Number(it.unit_price) || 0);
                      return (
                        <tr key={iIdx}>
                          {iIdx === 0 ? (
                            <td
                              rowSpan={rowspan}
                              className="border border-neutral-400 px-2 py-2 text-center align-middle bg-neutral-50 font-semibold"
                            >
                              {sec.category}
                            </td>
                          ) : null}
                          <td className="border border-neutral-400 px-2 py-1.5">
                            {it.assignee}
                          </td>
                          <td className="border border-neutral-400 px-2 py-1.5">
                            {it.task}
                          </td>
                          <td className="border border-neutral-400 px-2 py-1.5 text-right tabular-nums">
                            {it.man_month ? formatMm(it.man_month) : "-"}
                          </td>
                          <td className="border border-neutral-400 px-2 py-1.5 text-right tabular-nums">
                            {it.unit_price ? formatKRW(it.unit_price) : "-"}
                          </td>
                          <td className="border border-neutral-400 px-2 py-1.5 text-right tabular-nums">
                            {line ? formatKRW(line) : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {/* 섹션 소계 — 섹션이 2개 이상일 때만 (하나면 아래 '합계' 와 중복) */}
                  {sec.items.length > 0 && (quote.sections?.length ?? 0) > 1 ? (
                    <tr className="bg-neutral-100">
                      <td
                        colSpan={3}
                        className="border border-neutral-400 px-2 py-1.5 text-center font-semibold"
                      >
                        섹션 합계
                      </td>
                      <td className="border border-neutral-400 px-2 py-1.5 text-right tabular-nums font-semibold">
                        {formatMm(sumSection(sec).manMonth)}
                      </td>
                      <td className="border border-neutral-400 px-2 py-1.5"></td>
                      <td className="border border-neutral-400 px-2 py-1.5 text-right tabular-nums font-semibold">
                        {formatKRW(sumSection(sec).amount)}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}

            {/* 전체 합계 — 세부 소계와 최종 합계 사이 원값 (부가세 별도·절사 전) */}
            {gt !== raw ? (
              <tr className="bg-neutral-200">
                <td
                  colSpan={3}
                  className="border border-neutral-500 px-2 py-2 text-center font-bold text-[12px]"
                >
                  소계
                </td>
                <td className="border border-neutral-500 px-2 py-2 text-right tabular-nums font-bold">
                  {formatMm(totalMM)}
                </td>
                <td className="border border-neutral-500 px-2 py-2"></td>
                <td className="border border-neutral-500 px-2 py-2 text-right tabular-nums font-bold">
                  {formatKRW(raw)}
                </td>
              </tr>
            ) : null}

            {/* 최종 합계 */}
            <tr className="bg-sky-100">
              <td
                colSpan={5}
                className="border border-neutral-500 px-2 py-2.5 text-center font-bold text-[13px]"
              >
                총 합계
                {quote.round_to_10k
                  ? quote.vat_included
                    ? " (부가세 포함 · 만단위 절사)"
                    : " (부가세 별도 · 만단위 절사)"
                  : quote.vat_included
                    ? " (부가세 포함)"
                    : " (부가세 별도)"}
              </td>
              <td className="border border-neutral-500 px-2 py-2.5 text-right tabular-nums font-bold text-[13px]">
                {formatKRW(gt)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 하단 안내 — 서명·도장은 페이지 넘어가지 않게 keep-together */}
        <div className="mt-4 grid grid-cols-[1fr_240px] gap-4 keep-together">
          <ul className="text-[11px] text-neutral-700 space-y-1">
            {memoLines.map((m, i) => (
              <li key={i}>* {m}</li>
            ))}
          </ul>
          <div className="text-right relative">
            <div className="text-[11px] font-semibold mb-1">Authorized by,</div>
            <div className="inline-block relative pr-2">
              <div className="text-[12px] font-bold">
                {COMPANY_INFO.name}{" "}
                <span className="ml-1">대표이사 {COMPANY_INFO.ownerName}</span>
                <span className="inline-block align-middle w-[70px]"></span>
              </div>
              {/* 도장 — 대표이사 이름 위에 살짝 겹치게 (전통 인감 배치) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={COMPANY_INFO.sealPath}
                alt=""
                className="absolute right-[-8px] top-1/2 -translate-y-1/2 h-[70px] w-[70px] object-contain pointer-events-none"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** 투입공수 표시: 정수면 정수, 소수면 최대 2자리 (7 vs 7.5). */
function formatMm(n: number): string {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
}

function InfoCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.15em] uppercase text-white/50 font-semibold mb-0.5">
        {label}
      </div>
      <div
        className={`text-white font-semibold ${
          mono ? "font-mono tracking-wide" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
