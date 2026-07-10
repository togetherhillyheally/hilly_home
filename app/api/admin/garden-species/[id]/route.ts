import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 정원 종 공개 여부 등 토글 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  }

  let body: { is_published?: unknown };
  try {
    body = (await req.json()) as { is_published?: unknown };
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.is_published === "boolean") {
    update.is_published = body.is_published;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "변경할 필드가 없어요." },
      { status: 400 }
    );
  }

  const res = await adminFetch(`garden_species?id=eq.${id}`, {
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
