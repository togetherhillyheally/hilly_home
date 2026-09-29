import { notFound } from "next/navigation";
import { adminList } from "@/lib/admin-rest";
import { type QuoteRow } from "@/lib/quotes";
import QuotePrint from "./QuotePrint";

export const dynamic = "force-dynamic";

export default async function QuotePreviewPage({
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
  return <QuotePrint quote={q} />;
}
