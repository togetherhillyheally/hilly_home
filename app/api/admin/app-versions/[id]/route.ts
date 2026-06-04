import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set([
  "min_version",
  "latest_version",
  "store_url",
  "force_update",
  "message",
]);

const VERSION_RE = /^\d+\.\d+\.\d+$/;

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "변경할 필드가 없어요." },
      { status: 400 }
    );
  }

  // 버전 형식 검증 (semver x.y.z)
  for (const k of ["min_version", "latest_version"]) {
    if (typeof update[k] === "string" && !VERSION_RE.test(update[k] as string)) {
      return NextResponse.json(
        { error: `${k}는 'x.y.z' 형식이어야 해요.` },
        { status: 400 }
      );
    }
  }

  update.updated_at = new Date().toISOString();

  const res = await adminFetch(`app_versions?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `업데이트 실패: ${text || res.status}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
