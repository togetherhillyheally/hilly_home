import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PATCH — SOS 확인 처리/되돌리기. body: { source: 'app'|'tracker', id, resolve } */
export async function PATCH(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "sos")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: { source?: string; id?: string; resolve?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const resolve = body.resolve !== false;
  const now = resolve ? new Date().toISOString() : null;
  const by = resolve ? session.userId : null;

  let path: string;
  let patch: Record<string, unknown>;
  if (body.source === "app") {
    if (!body.id || !UUID_RE.test(body.id)) {
      return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
    }
    path = `session_sos_alerts?id=eq.${body.id}`;
    patch = { resolved_at: now, resolved_by: by };
  } else if (body.source === "tracker") {
    if (!body.id || !/^\d+$/.test(body.id)) {
      return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
    }
    path = `tracker_locations?id=eq.${body.id}&event=eq.SOS`;
    patch = { sos_acked_at: now, sos_acked_by: by };
  } else {
    return NextResponse.json({ error: "source 는 app 또는 tracker" }, { status: 400 });
  }

  const res = await adminFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return NextResponse.json({ error: `저장 실패: ${t || res.status}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
