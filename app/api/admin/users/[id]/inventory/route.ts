import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id: targetUserId } = await ctx.params;

  let objectId: string;
  try {
    const body = await req.json();
    objectId = String(body?.object_id ?? "").trim();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!UUID_RE.test(objectId)) {
    return NextResponse.json({ error: "잘못된 object_id" }, { status: 400 });
  }

  const res = await adminFetch("user_basecamp_inventory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify({
      user_id: targetUserId,
      object_id: objectId,
      source: "admin_grant",
    }),
  });
  if (!res.ok && res.status !== 409) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `부여 실패: ${text || res.status}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
