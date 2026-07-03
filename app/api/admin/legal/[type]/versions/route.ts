import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminList } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["terms", "privacy"]);

type VersionRow = {
  id: string;
  type: string;
  version: number;
  content_md: string;
  effective_date: string;
  saved_at: string;
  saved_by: string | null;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ type: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { type } = await ctx.params;
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: "잘못된 type" }, { status: 400 });
  }
  const { rows } = await adminList<VersionRow>(
    `legal_document_versions?type=eq.${type}&select=id,type,version,content_md,effective_date,saved_at,saved_by&order=version.desc`,
    { from: 0, to: 199 }
  );
  return NextResponse.json({ versions: rows });
}
