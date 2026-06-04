import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set([
  "is_active",
  "name",
  "description",
  "reward_description",
  "base_tier",
]);

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

  const res = await adminFetch(`puzzles?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
