import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set(["inactive", "active", "retired"]);

/** 기기 식별자 정규화 — 숫자만 12~15자리.
 *  MT710 은 IMEI 15자리, ML100G 등 JT808 기기는 라벨의 ID 12자리를 쓴다.
 *  (게이트웨이가 기기에게 받는 값과 같아야 위치가 연결된다) */
function normalizeDeviceId(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 15) return null;
  return digits;
}

async function guard(menuKey: "trackers") {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, menuKey)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return null;
}

// POST — 신규 기기 입고 (미배정 재고로 등록)
export async function POST(req: Request) {
  const denied = await guard("trackers");
  if (denied) return denied;

  let body: { imei?: unknown; hw_imei?: unknown; label?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const imei = normalizeDeviceId(body.imei);
  if (!imei) {
    return NextResponse.json(
      { error: "기기 ID는 숫자 12~15자리예요." },
      { status: 400 }
    );
  }
  // IMEI 는 참고용(선택) — 서버 연결에는 쓰지 않는다
  const hwDigits = String(body.hw_imei ?? "").replace(/\D/g, "");
  if (hwDigits && hwDigits.length !== 15) {
    return NextResponse.json(
      { error: "IMEI 는 15자리예요." },
      { status: 400 }
    );
  }
  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim()
      : null;

  const dup = await adminFetch(
    `tracker_devices?select=id&imei=eq.${encodeURIComponent(imei)}&limit=1`
  );
  if (dup.ok) {
    const rows = (await dup.json()) as unknown[];
    if (rows.length > 0) {
      return NextResponse.json(
        { error: "이미 등록된 기기 ID예요." },
        { status: 409 }
      );
    }
  }

  const res = await adminFetch("tracker_devices", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      imei,
      hw_imei: hwDigits || null,
      label,
      status: "inactive",
    }),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `등록 실패: ${await res.text()}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}

// PATCH — 배정/회수(user_id), 상태 변경(status), 라벨 수정(label)
export async function PATCH(req: Request) {
  const denied = await guard("trackers");
  if (denied) return denied;

  let body: {
    id?: unknown;
    user_id?: unknown;
    status?: unknown;
    label?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!id) {
    return NextResponse.json({ error: "기기를 지정해주세요." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  // user_id: null = 회수, uuid = 배정. 배정 시 실제 존재하는 사용자인지 확인.
  if ("user_id" in body) {
    const uid = body.user_id === null ? null : String(body.user_id ?? "");
    if (uid) {
      const p = await adminFetch(
        `profiles?select=id&id=eq.${encodeURIComponent(uid)}&limit=1`
      );
      const rows = p.ok ? ((await p.json()) as unknown[]) : [];
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "존재하지 않는 사용자예요." },
          { status: 400 }
        );
      }
    }
    patch.user_id = uid || null;
    // 중지(retired) 기기는 배정만 바꾸고 상태는 유지 — 재활성화는 명시적으로
    patch.status = uid ? "active" : "inactive";
  }

  if (typeof body.status === "string") {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: "상태 값이 올바르지 않아요." },
        { status: 400 }
      );
    }
    patch.status = body.status;
    if (body.status === "retired") patch.user_id = null; // 중지 시 배정 해제
  }

  if (typeof body.label === "string") {
    patch.label = body.label.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없어요." }, { status: 400 });
  }

  const res = await adminFetch(`tracker_devices?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `변경 실패: ${await res.text()}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
