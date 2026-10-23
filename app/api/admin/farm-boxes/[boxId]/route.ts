import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "stamps")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return null;
}

// PATCH — 이름·메모·위치 수정
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ boxId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { boxId } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  if ("title" in body) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "이름은 비울 수 없습니다." }, { status: 400 });
    }
    update.title = body.title.trim();
  }
  if ("note" in body) {
    update.note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  }
  for (const k of ["lat", "lng"] as const) {
    if (k in body) {
      const v = body[k];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        return NextResponse.json({ error: `${k} 값이 올바르지 않습니다.` }, { status: 400 });
      }
      update[k] = v;
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }
  const res = await adminFetch(`trail_farm_boxes?id=eq.${boxId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `수정 실패 (${res.status}): ${text}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// DELETE — 파밍박스 삭제
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ boxId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { boxId } = await ctx.params;
  const res = await adminFetch(`trail_farm_boxes?id=eq.${boxId}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `삭제 실패 (${res.status}): ${text}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
