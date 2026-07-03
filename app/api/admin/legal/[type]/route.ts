import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { type: string };

const ALLOWED = new Set(["terms", "privacy"]);

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { type } = await ctx.params;
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: "잘못된 type" }, { status: 400 });
  }
  const res = await adminFetch(
    `legal_documents?type=eq.${type}&select=type,content_md,effective_date,updated_at`
  );
  if (!res.ok) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  const rows = (await res.json()) as Array<{
    type: string;
    content_md: string;
    effective_date: string;
    updated_at: string;
  }>;
  return NextResponse.json({ doc: rows[0] ?? null });
}

export async function PUT(req: Request, ctx: { params: Promise<Params> }) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { type } = await ctx.params;
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: "잘못된 type" }, { status: 400 });
  }

  let body: {
    content_md?: string;
    effective_date?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const contentMd = typeof body.content_md === "string" ? body.content_md : "";
  const effectiveDate =
    typeof body.effective_date === "string" ? body.effective_date : "";
  if (!contentMd.trim()) {
    return NextResponse.json(
      { error: "내용을 입력해주세요." },
      { status: 400 }
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
    return NextResponse.json(
      { error: "시행일 형식이 잘못됐어요. (YYYY-MM-DD)" },
      { status: 400 }
    );
  }
  if (contentMd.length > 200_000) {
    return NextResponse.json(
      { error: "내용이 너무 커요. (최대 200KB)" },
      { status: 400 }
    );
  }

  // UPSERT — 트리거가 새 version 스냅샷 자동 생성
  const upsertRes = await adminFetch(
    `legal_documents?on_conflict=type`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        type,
        content_md: contentMd,
        effective_date: effectiveDate,
        updated_at: new Date().toISOString(),
        updated_by: session.userId,
      }),
    }
  );
  if (!upsertRes.ok) {
    const text = await upsertRes.text().catch(() => "");
    return NextResponse.json(
      { error: `저장 실패: ${text || upsertRes.status}` },
      { status: 500 }
    );
  }
  const rows = (await upsertRes.json()) as Array<{
    type: string;
    content_md: string;
    effective_date: string;
    updated_at: string;
  }>;
  return NextResponse.json({ doc: rows[0] ?? null });
}
