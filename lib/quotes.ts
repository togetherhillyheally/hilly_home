/**
 * 견적서 — 타입·상수·유틸.
 * 회사 정보(섭섭산중)는 현재 하드코딩. 나중에 관리자 설정으로 뽑을 수 있음.
 */

export const COMPANY_INFO = {
  name: "주식회사 힐리힐리",
  ownerName: "박준섭",
  bizNumber: "720-86-03798",
  contact: "010-8313-8230",
  address: "서울특별시 서초구 서초중앙로 123, 지하 1층 1003호(서초동)",
  // 사업자등록증명(2026-11-16 발급) 기준 — 거래명세서 공급자 칸
  bizType: "정보통신업",
  bizItem: "소프트웨어 개발 및 공급업",
  logoPath: "/images/company/hillyheally-logo.png", // 없어도 텍스트로 대체
  sealPath: "/images/company/hillyheally-seal.png", // 없어도 도장 생략
} as const;

export type TechLevel = "" | "초급" | "중급" | "고급" | "특급";

export type QuoteItem = {
  assignee: string;
  task: string;
  tech_level: TechLevel;
  /** 투입공수 M/M */
  man_month: number;
  /** 금액(단가) — M/M 당 원 */
  unit_price: number;
};

export type QuoteSection = {
  /** 예: "개발/출시" */
  category: string;
  /** 섹션 헤더 라벨. 예: "2. 전제 구축". 비우면 그룹 헤더 미표시 */
  group_label?: string;
  items: QuoteItem[];
};

export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "archived";

export type QuoteRow = {
  id: string;
  quote_no: string | null;
  recipient: string;
  project_name: string;
  quote_date: string; // yyyy-MM-dd
  preface: string | null;
  memo: string | null;
  vat_included: boolean;
  round_to_10k: boolean;
  /** 투입공수 컬럼 라벨. 개발=M/M, 스태프 일당="일", 시간제="시간" */
  unit_label: string;
  sections: QuoteSection[];
  status: QuoteStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function itemLineTotal(item: Pick<QuoteItem, "man_month" | "unit_price">): number {
  const mm = Number(item.man_month) || 0;
  const up = Number(item.unit_price) || 0;
  return Math.round(mm * up);
}

export function sumSection(section: QuoteSection): {
  manMonth: number;
  amount: number;
} {
  let mm = 0;
  let amt = 0;
  for (const it of section.items) {
    mm += Number(it.man_month) || 0;
    amt += itemLineTotal(it);
  }
  return { manMonth: mm, amount: amt };
}

export function sumQuote(sections: QuoteSection[]): {
  manMonth: number;
  amount: number;
} {
  let mm = 0;
  let amt = 0;
  for (const s of sections) {
    const t = sumSection(s);
    mm += t.manMonth;
    amt += t.amount;
  }
  return { manMonth: mm, amount: amt };
}

/** 만단위 절사 (10000 미만 자리 버림) */
export function roundDownTo10K(n: number): number {
  return Math.floor(n / 10000) * 10000;
}

export function grandTotal(quote: Pick<QuoteRow, "sections" | "round_to_10k" | "vat_included">): number {
  const raw = sumQuote(quote.sections).amount;
  const rounded = quote.round_to_10k ? roundDownTo10K(raw) : raw;
  return quote.vat_included ? Math.round(rounded * 1.1) : rounded;
}

/**
 * 거래명세서 줄 — 줄마다 공급가액·세액.
 * 세액은 줄별 10% 반올림이고, 끝자리 차이는 마지막 줄에서 맞춰 합계가 grandTotal 과 같게 한다.
 * 만단위 절사로 공급가액 합이 줄 합보다 작아지면 '절사' 줄(음수)을 붙인다.
 */
export type StatementLine = {
  label: string;
  qty: number;
  unitPrice: number;
  supply: number;
  tax: number;
};

export function statementLines(
  quote: Pick<QuoteRow, "sections" | "round_to_10k" | "vat_included">
): { lines: StatementLine[]; supplyTotal: number; taxTotal: number; total: number } {
  const lines: StatementLine[] = [];
  for (const s of quote.sections ?? []) {
    for (const it of s.items) {
      const supply = itemLineTotal(it);
      if (!supply) continue;
      lines.push({
        label: it.task || it.assignee || s.category,
        qty: Number(it.man_month) || 0,
        unitPrice: Number(it.unit_price) || 0,
        supply,
        tax: 0,
      });
    }
  }
  const raw = lines.reduce((a, l) => a + l.supply, 0);
  const supplyTotal = quote.round_to_10k ? roundDownTo10K(raw) : raw;
  if (supplyTotal !== raw) {
    lines.push({ label: "만단위 절사", qty: 0, unitPrice: 0, supply: supplyTotal - raw, tax: 0 });
  }
  const total = grandTotal(quote);
  const taxTotal = total - supplyTotal;
  if (taxTotal > 0 && lines.length > 0) {
    let acc = 0;
    lines.forEach((l, i) => {
      if (i === lines.length - 1) l.tax = taxTotal - acc;
      else {
        l.tax = Math.round(l.supply * 0.1);
        acc += l.tax;
      }
    });
  }
  return { lines, supplyTotal, taxTotal, total };
}

/** 1000000 → "일백만" (금액 한글 표기, '원정' 은 호출부에서) */
export function koreanAmount(n: number): string {
  const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const small = ["", "십", "백", "천"];
  const big = ["", "만", "억", "조"];
  let v = Math.floor(Math.abs(n));
  if (v === 0) return "영";
  let out = "";
  let b = 0;
  while (v > 0) {
    const chunk = v % 10000;
    if (chunk) {
      let s = "";
      let c = chunk;
      for (let i = 0; i < 4 && c > 0; i++, c = Math.floor(c / 10)) {
        const d = c % 10;
        if (d) s = digits[d] + small[i] + s;
      }
      out = s + big[b] + out;
    }
    v = Math.floor(v / 10000);
    b++;
  }
  return out;
}

export function formatKRW(n: number): string {
  return `₩${(n ?? 0).toLocaleString("ko-KR")}`;
}

export function formatDateKo(iso: string): string {
  // iso: yyyy-MM-dd
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

export function emptyQuoteDraft(): {
  recipient: string;
  project_name: string;
  quote_date: string;
  unit_label: string;
  preface: string;
  memo: string;
  vat_included: boolean;
  round_to_10k: boolean;
  sections: QuoteSection[];
} {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(today.getDate()).padStart(2, "0")}`;
  return {
    recipient: "(수신인 미입력)",
    project_name: "새 견적서",
    quote_date: iso,
    unit_label: "M/M",
    preface: "본 프로젝트의 내역에 따른 견적서입니다.",
    memo: [
      "결제수단은 현금이며, 지급방법은 계약서의 내용에 준합니다.",
      "본 견적은 견적일로부터 1개월간 유효합니다.",
      "견적하지 않은 출장비(교통비, 숙박, 식대 등)는 실비 정산기준임",
    ].join("\n"),
    vat_included: false,
    round_to_10k: true,
    sections: [
      {
        category: "개발/출시",
        group_label: "1. 전체 구축",
        items: [
          {
            assignee: "",
            task: "",
            tech_level: "고급",
            man_month: 0,
            unit_price: 8000000,
          },
        ],
      },
    ],
  };
}
