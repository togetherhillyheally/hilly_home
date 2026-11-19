import { notFound } from "next/navigation";
import { adminList } from "@/lib/admin-rest";
import { type QuoteRow } from "@/lib/quotes";
import StatementPrint from "./StatementPrint";

export const dynamic = "force-dynamic";

/** 견적서 데이터로 만드는 거래명세서 (인쇄·PDF 저장용) */
export default async function QuoteStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { rows } = await adminList<QuoteRow>(
    `quotes?select=*&id=eq.${id}&limit=1`
  );
  const q = rows[0];
  if (!q) notFound();
  return <StatementPrint quote={q} />;
}
