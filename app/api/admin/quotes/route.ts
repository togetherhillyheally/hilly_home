import { NextRequest, NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch, adminList } from "@/lib/admin-rest";
import type { QuoteRow } from "@/lib/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "quotes")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();
  const from = Number(url.searchParams.get("from") ?? "0");
  const to = Number(url.searchParams.get("to") ?? "49");

  let path = `quotes?select=id,quote_no,recipient,project_name,quote_date,status,sections,vat_included,round_to_10k,created_at,updated_at&order=quote_date.desc,created_at.desc`;
  if (search) {
    const s = search.replace(/[%_]/g, "").replace(/[,()]/g, " ");
    path += `&or=(recipient.ilike.%${s}%,project_name.ilike.%${s}%,quote_no.ilike.%${s}%)`;
  }
  const { rows, total } = await adminList<QuoteRow>(path, {
    count: true,
    from,
    to,
  });
  return NextResponse.json({ rows, total });
}

export async function POST(req: NextRequest) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "quotes")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const b = (body ?? {}) as Partial<QuoteRow>;
  if (!b.recipient?.trim() || !b.project_name?.trim()) {
    return NextResponse.json(
      { error: "수신인·견적명은 필수입니다." },
      { status: 400 }
    );
  }
  const insert = {
    recipient: b.recipient.trim(),
    project_name: b.project_name.trim(),
    quote_date: b.quote_date ?? new Date().toISOString().slice(0, 10),
    preface: b.preface ?? null,
    memo: b.memo ?? null,
    vat_included: !!b.vat_included,
    round_to_10k: b.round_to_10k !== false,
    sections: Array.isArray(b.sections) ? b.sections : [],
    status: (b.status as string) ?? "draft",
    created_by: session.userId,
  };
  const res = await adminFetch("quotes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(insert),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `등록 실패 (${res.status}): ${text.slice(0, 500)}` },
      { status: 500 }
    );
  }
  const arr = (await res.json()) as QuoteRow[];
  return NextResponse.json({ success: true, row: arr[0] });
}
