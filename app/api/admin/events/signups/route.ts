import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SQUADS = new Set(["A", "B", "C", "D"]);

type Update = { id: string; team_no: number | null; squad: string | null };

/** PATCH — 팀/조 배정 일괄 저장. body: { updates: [{ id, team_no, squad }] } */
export async function PATCH(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "events")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: { updates?: unknown };
  try {
    body = (await req.json()) as { updates?: unknown };
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!Array.isArray(body.updates) || body.updates.length === 0) {
    return NextResponse.json({ error: "updates 가 비었어요." }, { status: 400 });
  }
  if (body.updates.length > 200) {
    return NextResponse.json({ error: "한 번에 200건까지만." }, { status: 400 });
  }

  const updates: Update[] = [];
  for (const raw of body.updates) {
    const u = raw as Partial<Update>;
    if (typeof u.id !== "string" || !UUID_RE.test(u.id)) {
      return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
    }
    let team_no: number | null = null;
    if (u.team_no != null) {
      const n = Number(u.team_no);
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        return NextResponse.json(
          { error: "team_no 는 1~20 정수 또는 null" },
          { status: 400 }
        );
      }
      team_no = n;
    }
    let squad: string | null = null;
    if (u.squad != null && u.squad !== "") {
      const s = String(u.squad).toUpperCase();
      if (!SQUADS.has(s)) {
        return NextResponse.json({ error: "squad 는 A~D 또는 null" }, { status: 400 });
      }
      squad = s;
    }
    // 팀이 없으면 조도 의미 없음 — 함께 비운다
    if (team_no == null) squad = null;
    updates.push({ id: u.id, team_no, squad });
  }

  for (const u of updates) {
    const res = await adminFetch(`event_signups?id=eq.${u.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        team_no: u.team_no,
        squad: u.squad,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `저장 실패 (${u.id.slice(0, 8)}): ${text || res.status}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, count: updates.length });
}
