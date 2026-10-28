import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 기기 원격 명령 — tracker_commands 큐에 넣으면 NCP 게이트웨이가 10초마다
 * 폴링해 연결된 기기로 보낸다. 기기 응답이 오면 acked/failed 로 갱신된다.
 *
 * 프로토콜별 문법이 달라 화이트리스트로 제한:
 *   MT710(텍스트)   MODE,모드,간격 / REBOOT
 *   JT808(ML100G 등) INTERVAL,초 / HEARTBEAT,초 / REBOOT / PARAM(설정 조회)
 */
const ALLOWED = [
  /^MODE,[0-9]+,[0-9]+(,[0-9]+)?$/,
  /^HEARTBEAT,[0-9]{2,5}$/,
  /^REBOOT$/,
  /^PARAM$/,
];

/** INTERVAL 은 초 범위까지 본다. 매뉴얼 규정은 10~3600 이지만 ML100G 가 공장
 *  출고 상태에서 2초로 보고하는 걸 실측해 하한을 1초로 열어둔다 —
 *  기기가 거부하면 명령이 failed 로 남아 화면에서 확인할 수 있다. */
function isAllowed(command: string): boolean {
  const m = command.match(/^INTERVAL,(\d+)$/);
  if (m) {
    const sec = Number(m[1]);
    return sec >= 1 && sec <= 3600;
  }
  return ALLOWED.some((re) => re.test(command));
}

export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "trackers")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: { device_id?: unknown; command?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const deviceId = String(body.device_id ?? "");
  const command = String(body.command ?? "").trim().toUpperCase();
  if (!deviceId) {
    return NextResponse.json({ error: "기기를 지정해주세요." }, { status: 400 });
  }
  if (!isAllowed(command)) {
    return NextResponse.json(
      { error: "허용되지 않은 명령이에요." },
      { status: 400 }
    );
  }

  const res = await adminFetch("tracker_commands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_id: deviceId,
      command,
      status: "pending",
    }),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `명령 등록 실패: ${await res.text()}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
