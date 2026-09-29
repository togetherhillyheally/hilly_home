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
        }
      `}</style>

      {/* ===== 페이지 1: 표지 ===== */}
      <section className="mx-auto max-w-[210mm] bg-white shadow-sm p-8 mb-4 print:mb-0 print:shadow-none">
        <div className="bg-[#4A9CB0] text-white p-10 rounded-md min-h-[520px] flex flex-col">
          <div className="flex-1">
            <div className="text-4xl font-bold tracking-wider opacity-95 mb-1">
              {COMPANY_INFO.name}
            </div>
            <div className="mt-16">
              <h1 className="text-5xl md:text-6xl font-black leading-tight whitespace-pre-line">
                {quote.project_name}
                {"\n견적서"}
              </h1>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-2 text-[15px] font-semibold text-neutral-800">
          <div>발주자명: {COMPANY_INFO.ownerName}</div>
          <div>사업자번호: {COMPANY_INFO.bizNumber}</div>
          <div>연락처: {COMPANY_INFO.contact}</div>
          <div>주소: {COMPANY_INFO.address}</div>
          <div>견적일자: {formatDateKo(quote.quote_date)}</div>
        </div>
      </section>

      {/* ===== 페이지 2: 상세 ===== */}
      <section className="page-break mx-auto max-w-[210mm] bg-white shadow-sm p-8 print:shadow-none">
        {/* 헤더 표 */}
        <table className="w-full text-[12px] border-collapse mb-4">
          <tbody>
            <tr>
              <th className="w-[80px] bg-neutral-100 border border-neutral-300 px-2 py-1.5 text-left align-middle">
                수신인
              </th>
              <td className="border border-neutral-300 px-2 py-1.5">
                {quote.recipient}
              </td>
              <th className="w-[80px] bg-neutral-100 border border-neutral-300 px-2 py-1.5 text-left align-middle">
                견적일
              </th>
              <td className="w-[140px] border border-neutral-300 px-2 py-1.5">
                {formatDateKo(quote.quote_date)}
              </td>
            </tr>
            <tr>
              <th className="bg-neutral-100 border border-neutral-300 px-2 py-1.5 text-left align-middle">
                발신인
              </th>
              <td className="border border-neutral-300 px-2 py-1.5">
                {COMPANY_INFO.name}
              </td>
              <th className="bg-neutral-100 border border-neutral-300 px-2 py-1.5 text-left align-middle">
                페이지
              </th>
              <td className="border border-neutral-300 px-2 py-1.5">2 / 2</td>
            </tr>
            <tr>
              <th className="bg-neutral-100 border border-neutral-300 px-2 py-1.5 text-left align-middle">
                견적명
              </th>
              <td colSpan={3} className="border border-neutral-300 px-2 py-1.5">
                {quote.project_name}
              </td>
            </tr>
          </tbody>
        </table>

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
              <th className="w-[70px] border border-neutral-400 px-2 py-2 text-center">
                구분
              </th>
              <th className="w-[180px] border border-neutral-400 px-2 py-2 text-center">
                담당자
              </th>
              <th className="border border-neutral-400 px-2 py-2 text-center">
                담당업무
              </th>
              <th className="w-[60px] border border-neutral-400 px-2 py-2 text-center">
                기술등급
              </th>
              <th className="w-[80px] border border-neutral-400 px-2 py-2 text-center">
                투입공수(M/M)
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
                        colSpan={7}
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
                        colSpan={6}
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
                          <td className="border border-neutral-400 px-2 py-1.5 text-center">
                            {it.tech_level || "-"}
                          </td>
                          <td className="border border-neutral-400 px-2 py-1.5 text-right tabular-nums">
                            {it.man_month
                              ? Number(it.man_month).toFixed(2)
                              : "-"}
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
                  {/* 섹션 소계 */}
                  {sec.items.length > 0 ? (
                    <tr className="bg-neutral-100">
                      <td
                        colSpan={4}
                        className="border border-neutral-400 px-2 py-1.5 text-center font-semibold"
                      >
                        섹션 합계
                      </td>
                      <td className="border border-neutral-400 px-2 py-1.5 text-right tabular-nums font-semibold">
                        {sumSection(sec).manMonth.toFixed(2)}
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

            {/* 전체 합계 */}
            <tr className="bg-neutral-200">
              <td
                colSpan={4}
                className="border border-neutral-500 px-2 py-2 text-center font-bold text-[12px]"
              >
                합계
              </td>
              <td className="border border-neutral-500 px-2 py-2 text-right tabular-nums font-bold">
                {totalMM.toFixed(2)}
              </td>
              <td className="border border-neutral-500 px-2 py-2"></td>
              <td className="border border-neutral-500 px-2 py-2 text-right tabular-nums font-bold">
                {formatKRW(raw)}
              </td>
            </tr>

            {/* 턴키 개발 합계 */}
            <tr className="bg-sky-100">
              <td
                colSpan={6}
                className="border border-neutral-500 px-2 py-2.5 text-center font-bold text-[13px]"
              >
                턴키 개발 합계
                {quote.round_to_10k
                  ? quote.vat_included
                    ? " (부가세 포함/만단위 절사)"
                    : " (부가세 별도/만단위 절사)"
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

        {/* 하단 안내 */}
        <div className="mt-4 grid grid-cols-[1fr_180px] gap-4">
          <ul className="text-[11px] text-neutral-700 space-y-1">
            {memoLines.map((m, i) => (
              <li key={i}>* {m}</li>
            ))}
          </ul>
          <div className="text-right">
            <div className="text-[11px] font-semibold mb-1">Authorized by,</div>
            <div className="h-16 flex items-end justify-end">
              {/* 도장 이미지 자리 — 없으면 이름만 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={COMPANY_INFO.sealPath}
                alt=""
                className="h-14 w-auto object-contain opacity-90"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="text-[11px] font-bold mt-1">
              {COMPANY_INFO.name} {COMPANY_INFO.ownerName}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
