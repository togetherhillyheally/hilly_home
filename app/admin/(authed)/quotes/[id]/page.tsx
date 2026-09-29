import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import { type QuoteRow } from "@/lib/quotes";
import QuoteEditor from "./QuoteEditor";

export const dynamic = "force-dynamic";

export default async function QuoteEditPage({
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

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/quotes"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-2"
          >
            <ChevronLeft className="h-4 w-4" />
            견적서 목록
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            견적서 편집
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            {q.quote_no ?? "-"}
          </p>
        </div>
        <Link
          href={`/admin/quotes/${q.id}/preview`}
          target="_blank"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-sm font-semibold"
        >
          <Printer className="h-4 w-4" />
          미리보기 · 인쇄
        </Link>
      </header>

      <QuoteEditor initial={q} />
    </main>
  );
}
