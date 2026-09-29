import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import {
  formatKRW,
  grandTotal,
  sumQuote,
  type QuoteRow,
} from "@/lib/quotes";
import QuotesToolbar from "./QuotesToolbar";
import CreateQuoteButton from "./CreateQuoteButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: {
    label: "작성중",
    className: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  },
  sent: {
    label: "발송",
    className: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  accepted: {
    label: "수주",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  rejected: {
    label: "실주",
    className: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  archived: {
    label: "보관",
    className: "bg-white/[0.06] text-gray-500 border-white/10",
  },
};

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = q?.trim() ?? "";

  let path =
    "quotes?select=id,quote_no,recipient,project_name,quote_date,status,sections,vat_included,round_to_10k,created_at&order=quote_date.desc,created_at.desc";
  if (search) {
    const s = search.replace(/[%_]/g, "").replace(/[,()]/g, " ");
    path += `&or=(recipient.ilike.%${s}%,project_name.ilike.%${s}%,quote_no.ilike.%${s}%)`;
  }
  const { rows } = await adminList<QuoteRow>(path, {
    count: true,
    from: 0,
    to: 99,
  });

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight inline-flex items-center gap-2">
            <Receipt className="h-6 w-6 text-orange-300" />
            견적서 관리
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            섭섭산중 견적서를 작성·수정하고, 브라우저 인쇄로 PDF 저장하세요.
          </p>
        </div>
        <CreateQuoteButton />
      </header>

      <QuotesToolbar initialQuery={search} total={rows.length} />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          {search ? (
            <>
              &lsquo;{search}&rsquo; 검색 결과가 없어요.
            </>
          ) : (
            <>
              아직 등록된 견적서가 없어요.
              <div className="mt-3">
                <Link
                  href="#"
                  className="text-orange-300 text-sm inline-flex items-center gap-1 hover:text-orange-200"
                >
                  <Plus className="h-4 w-4" /> 상단 &lsquo;새 견적서&rsquo; 버튼으로 시작
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03]">
              <tr className="text-gray-400 text-xs">
                <th className="px-3 py-2.5 text-left">견적번호</th>
                <th className="px-3 py-2.5 text-left">견적명</th>
                <th className="px-3 py-2.5 text-left">수신인</th>
                <th className="px-3 py-2.5 text-left">견적일</th>
                <th className="px-3 py-2.5 text-right">공급가</th>
                <th className="px-3 py-2.5 text-center">상태</th>
                <th className="px-3 py-2.5 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => {
                const st = STATUS_LABEL[q.status] ?? STATUS_LABEL.draft;
                const sum = sumQuote(q.sections ?? []).amount;
                const gt = grandTotal(q);
                return (
                  <tr
                    key={q.id}
                    className="border-t border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-300">
                      {q.quote_no ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-white">
                      <Link
                        href={`/admin/quotes/${q.id}`}
                        className="hover:underline"
                      >
                        {q.project_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-gray-300">{q.recipient}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs tabular-nums">
                      {q.quote_date}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <div className="text-white font-semibold">
                        {formatKRW(gt)}
                      </div>
                      {gt !== sum ? (
                        <div className="text-[10px] text-gray-500">
                          (원가 {formatKRW(sum)})
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center px-1.5 h-5 rounded-md border text-[10px] font-medium ${st.className}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/admin/quotes/${q.id}/preview`}
                        target="_blank"
                        className="text-xs text-orange-300 hover:text-orange-200"
                      >
                        미리보기
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
