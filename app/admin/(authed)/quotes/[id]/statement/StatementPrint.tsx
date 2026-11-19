"use client";

import { ArrowLeft, Printer } from "lucide-react";
import {
  COMPANY_INFO,
  koreanAmount,
  statementLines,
  type QuoteRow,
} from "@/lib/quotes";

/**
 * 거래명세서 — 견적서와 같은 품목·금액으로 출력 (2026-11-19).
 * 흔히 쓰는 양식대로 공급자 정보만 표로 두고, 받는 곳은 상호만 '귀중' 으로 적는다.
 * 거래일자는 견적일자를 쓴다.
 */
export default function StatementPrint({ quote }: { quote: QuoteRow }) {
  const { lines, supplyTotal, taxTotal, total } = statementLines(quote);
  const [yy, mm, dd] = quote.quote_date.split("-");
  const monthDay = mm && dd ? `${mm}/${dd}` : "";
  const serial = `${yy}/${mm}/${dd} · ${quote.quote_no ?? "-"}`;
  const qtyTotal = lines.reduce((a, l) => a + (l.qty || 0), 0);
  const blankRows = Math.max(0, 6 - lines.length);
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

      <section className="mx-auto my-4 print:my-0 max-w-[210mm] bg-white shadow-sm print:shadow-none p-10 print:p-0 text-[12px]">
        {/* 상단: 좌 로고·제목·받는 곳 / 우 공급자 */}
        <div className="grid grid-cols-[1fr_1.05fr] gap-6 items-stretch">
          <div className="flex flex-col justify-between gap-5">
            <div className="flex items-center gap-4 pt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/home_logo.png"
                alt="Hilly Heally"
                className="h-12 w-auto"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <h1 className="text-[28px] font-black tracking-[0.12em]">거래명세서</h1>
            </div>
            <div className="border border-neutral-700 px-4 py-4 text-center text-[14px] font-semibold">
              {quote.recipient} <span className="ml-1">貴中</span>
            </div>
          </div>

          <div className="flex border border-neutral-700">
            <div className="w-[26px] shrink-0 bg-neutral-100 border-r border-neutral-700 flex items-center justify-center font-semibold [writing-mode:vertical-rl] tracking-[0.3em]">
              공급자용
            </div>
            <table className="flex-1 border-collapse">
              <tbody>
                <tr>
                  <K>일련번호</K>
                  <V>{serial}</V>
                  <K narrow>TEL</K>
                  <V>{COMPANY_INFO.contact}</V>
                </tr>
                <tr className="border-t border-neutral-500">
                  <K>
                    사업자
                    <br />
                    등록번호
                  </K>
                  <V>{COMPANY_INFO.bizNumber}</V>
                  <K narrow>성명</K>
                  <V>
                    <span className="relative inline-block pr-9">
                      {COMPANY_INFO.ownerName}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={COMPANY_INFO.sealPath}
                        alt=""
                        className="absolute right-[-14px] top-1/2 -translate-y-1/2 h-[58px] w-[58px] object-contain pointer-events-none"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </span>
                  </V>
                </tr>
                <tr className="border-t border-neutral-500">
                  <K>상호</K>
                  <V colSpan={3}>{COMPANY_INFO.name}</V>
                </tr>
                <tr className="border-t border-neutral-500">
                  <K>주소</K>
                  <V colSpan={3}>{COMPANY_INFO.address}</V>
                </tr>
                <tr className="border-t border-neutral-500">
                  <K>업태</K>
                  <V>{COMPANY_INFO.bizType}</V>
                  <K narrow>종목</K>
                  <V>{COMPANY_INFO.bizItem}</V>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 금액 */}
        <div className="mt-5 flex items-center justify-between border-2 border-neutral-800 px-5 py-2.5 text-[16px] font-bold">
          <div>
            금&nbsp;&nbsp;액 : {koreanAmount(total)}원 정
            <span className="ml-2 text-[11px] font-medium text-neutral-500">
              ({taxTotal > 0 ? "부가세 포함" : "부가세 별도"})
            </span>
          </div>
          <div>(₩{total.toLocaleString("ko-KR")})</div>
        </div>

        {/* 품목 */}
        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="bg-neutral-100">
              <Th className="w-[52px]">일자</Th>
              <Th>품목명[규격]</Th>
              <Th className="w-[44px]">수량</Th>
              <Th className="w-[82px]">단가</Th>
              <Th className="w-[90px]">공급가액</Th>
              <Th className="w-[70px]">부가세</Th>
              <Th className="w-[90px]">적요</Th>
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
                <Td right>{l.tax ? won(l.tax) : "-"}</Td>
                <Td>&nbsp;</Td>
              </tr>
            ))}
            {Array.from({ length: blankRows }).map((_, i) => (
              <tr key={`b${i}`}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <Td key={j}>&nbsp;</Td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 합계 줄 */}
        <table className="mt-2 w-full border-collapse border-2 border-neutral-800">
          <tbody>
            <tr>
              <SumK>수량</SumK>
              <SumV>{qtyTotal}</SumV>
              <SumK>공급가액</SumK>
              <SumV>{supplyTotal.toLocaleString("ko-KR")}</SumV>
              <SumK>VAT</SumK>
              <SumV>{taxTotal.toLocaleString("ko-KR")}</SumV>
              <SumK>합계</SumK>
              <SumV>{total.toLocaleString("ko-KR")}</SumV>
              <SumK>인수</SumK>
              <SumV>인</SumV>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

function K({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <td
      className={`${
        narrow ? "w-[48px]" : "w-[70px]"
      } bg-neutral-50 border-r border-neutral-500 px-1.5 py-2 text-center font-semibold leading-tight whitespace-nowrap`}
    >
      {children}
    </td>
  );
}

function V({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className="border-r border-neutral-500 last:border-r-0 px-2 py-2 leading-snug">
      {children}
    </td>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-neutral-400 px-2 py-2 text-center font-semibold ${className}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  center,
  right,
}: {
  children: React.ReactNode;
  center?: boolean;
  right?: boolean;
}) {
  return (
    <td
      className={`border border-neutral-400 px-2 py-1.5 ${
        center ? "text-center" : right ? "text-right tabular-nums" : ""
      }`}
    >
      {children}
    </td>
  );
}

function SumK({ children }: { children: React.ReactNode }) {
  return (
    <td className="bg-neutral-50 border border-neutral-500 px-2 py-2 text-center font-semibold whitespace-nowrap">
      {children}
    </td>
  );
}

function SumV({ children }: { children: React.ReactNode }) {
  return (
    <td className="border border-neutral-500 px-2 py-2 text-right tabular-nums">{children}</td>
  );
}
