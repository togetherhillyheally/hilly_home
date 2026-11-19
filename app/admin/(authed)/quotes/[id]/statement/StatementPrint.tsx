"use client";

import { ArrowLeft, Printer } from "lucide-react";
import {
  COMPANY_INFO,
  formatDateKo,
  koreanAmount,
  statementLines,
  type QuoteRow,
} from "@/lib/quotes";

/**
 * 거래명세서 — 견적서와 같은 품목·금액으로 출력 (2026-11-19).
 * 거래일자는 견적일자를 쓴다. 공급자 정보만 표로 두고 받는 곳은 상호만 적는다.
 */
export default function StatementPrint({ quote }: { quote: QuoteRow }) {
  const { lines, supplyTotal, taxTotal, total } = statementLines(quote);
  const [, mm, dd] = quote.quote_date.split("-");
  const monthDay = mm && dd ? `${Number(mm)}/${Number(dd)}` : "";
  const blankRows = Math.max(0, 8 - lines.length);
  const won = (n: number) => (n ? n.toLocaleString("ko-KR") : "");

  return (
    <div className="statement-print-root fixed inset-0 z-[100] overflow-y-auto bg-neutral-100 text-black print:static print:overflow-visible">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              window.close();
              history.back();
            }}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-md text-neutral-600 hover:bg-neutral-100 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> 닫기
          </button>
          <div className="text-xs text-neutral-500 font-mono">
            {quote.quote_no ?? "-"} · 거래명세서
          </div>
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
          body * {
            visibility: hidden !important;
          }
          .statement-print-root,
          .statement-print-root * {
            visibility: visible !important;
          }
          .statement-print-root {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            overflow: visible !important;
            background: #fff !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <section className="mx-auto my-4 print:my-0 max-w-[210mm] bg-white shadow-sm print:shadow-none p-10 print:p-0 text-[11px]">
        <h1 className="text-center text-[28px] font-black tracking-[0.5em] mb-1">
          거래명세서
        </h1>
        <p className="text-center text-[11px] text-neutral-500 mb-6">
          (공급받는자 보관용)
        </p>

        <div className="flex justify-between items-end mb-2 text-[12px]">
          <div className="space-y-1">
            <div className="text-[14px] font-bold">{quote.recipient} 귀하</div>
            <div>
              거래일자 : <b>{formatDateKo(quote.quote_date)}</b>
            </div>
          </div>
          <div className="text-neutral-600">No. {quote.quote_no ?? "-"}</div>
        </div>

        {/* 공급자 — 공급받는자 칸은 두지 않는다 (받는 곳은 위 '귀하' 줄) */}
        <div className="border border-neutral-700">
          <PartyBox
            title="공급자"
            rows={[
              ["등록번호", COMPANY_INFO.bizNumber],
              ["상호", COMPANY_INFO.name],
              ["대표자", COMPANY_INFO.ownerName, true],
              ["주소", COMPANY_INFO.address],
              ["업태", COMPANY_INFO.bizType],
              ["종목", COMPANY_INFO.bizItem],
              ["연락처", COMPANY_INFO.contact],
            ]}
          />
        </div>

        {/* 합계금액 */}
        <div className="mt-3 flex border border-neutral-700 text-[13px]">
          <div className="w-[110px] shrink-0 bg-neutral-100 border-r border-neutral-700 px-3 py-2.5 font-bold text-center">
            합계금액
          </div>
          <div className="flex-1 px-4 py-2.5 font-bold">
            일금 {koreanAmount(total)}원정
            <span className="ml-3 font-semibold">
              (₩{total.toLocaleString("ko-KR")})
            </span>
          </div>
          <div className="px-3 py-2.5 text-neutral-600 text-[11px] self-center">
            {taxTotal > 0 ? "부가세 포함" : "부가세 별도"}
          </div>
        </div>

        {/* 품목 */}
        <table className="mt-3 w-full border-collapse">
          <thead>
            <tr className="bg-neutral-100">
              <Th className="w-[44px]">월/일</Th>
              <Th>품목</Th>
              <Th className="w-[44px]">수량</Th>
              <Th className="w-[86px]">단가</Th>
              <Th className="w-[96px]">공급가액</Th>
              <Th className="w-[80px]">세액</Th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <Td center>{monthDay}</Td>
                <Td>{l.label}</Td>
                <Td center>{l.qty || ""}</Td>
                <Td right>{won(l.unitPrice)}</Td>
                <Td right>{won(l.supply)}</Td>
                <Td right>{won(l.tax)}</Td>
              </tr>
            ))}
            {Array.from({ length: blankRows }).map((_, i) => (
              <tr key={`b${i}`}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <Td key={j}>&nbsp;</Td>
                ))}
              </tr>
            ))}
            <tr className="bg-neutral-100 font-bold">
              <Td center colSpan={4}>
                계
              </Td>
              <Td right>{won(supplyTotal)}</Td>
              <Td right>{taxTotal ? won(taxTotal) : "0"}</Td>
            </tr>
            <tr className="bg-sky-50 font-bold text-[12px]">
              <Td center colSpan={4}>
                합계 (공급가액 + 세액)
              </Td>
              <Td right colSpan={2}>
                ₩{total.toLocaleString("ko-KR")}
              </Td>
            </tr>
          </tbody>
        </table>

        <p className="mt-6 text-center text-[13px]">
          위 금액을 정히 청구합니다.
        </p>

        <div className="mt-6 text-right">
          <div className="inline-block relative pr-2 text-[13px] font-bold">
            공급자 {COMPANY_INFO.name}
            <span className="ml-2">대표이사 {COMPANY_INFO.ownerName}</span>
            <span className="inline-block align-middle w-[64px]"></span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={COMPANY_INFO.sealPath}
              alt=""
              className="absolute right-[-6px] top-1/2 -translate-y-1/2 h-[64px] w-[64px] object-contain pointer-events-none"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function PartyBox({
  title,
  rows,
  borderLeft,
}: {
  title: string;
  rows: [string, string, boolean?][];
  borderLeft?: boolean;
}) {
  return (
    <div className={`flex ${borderLeft ? "border-l border-neutral-700" : ""}`}>
      <div className="w-[26px] shrink-0 bg-neutral-100 border-r border-neutral-700 flex items-center justify-center font-bold text-[12px] [writing-mode:vertical-rl] tracking-[0.4em]">
        {title}
      </div>
      <table className="flex-1 border-collapse">
        <tbody>
          {rows.map(([k, v, seal], i) => (
            <tr key={k} className={i ? "border-t border-neutral-400" : ""}>
              <td className="w-[62px] bg-neutral-50 border-r border-neutral-400 px-1.5 py-1.5 text-center text-neutral-700 whitespace-nowrap">
                {k}
              </td>
              <td className="px-2 py-1.5 leading-snug">
                {v}
                {seal ? <span className="ml-2 text-neutral-500">(인)</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-neutral-500 px-2 py-2 text-center font-semibold ${className}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  center,
  right,
  colSpan,
}: {
  children: React.ReactNode;
  center?: boolean;
  right?: boolean;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border border-neutral-500 px-2 py-1.5 ${
        center ? "text-center" : right ? "text-right tabular-nums" : ""
      }`}
    >
      {children}
    </td>
  );
}
