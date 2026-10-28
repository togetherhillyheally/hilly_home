import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]+$/i;
const MAX_TEMPLATE = 1000;

async function guard() {
  const session = await readAdminSession();
  if (!session) {
    return { error: NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  }
  if (!hasMenuAccess(session, "events")) {
    return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }
  return { session };
}

/** PUT — 결제 확정 문자 설정 저장. body: { slug, enabled, template } */
export async function PUT(req: Request) {
  const { session, error } = await guard();
  if (error) return error;

  let body: { slug?: unknown; enabled?: unknown; template?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "잘못된 이벤트" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean" || typeof body.template !== "string") {
    return NextResponse.json({ error: "enabled·template 이 필요해요." }, { status: 400 });
  }
  const template = body.template.replace(/\r\n/g, "\n");
  if (template.length > MAX_TEMPLATE) {
    return NextResponse.json({ error: `문구는 ${MAX_TEMPLATE}자까지.` }, { status: 400 });
  }
  if (body.enabled && !template.trim()) {
    return NextResponse.json({ error: "문구가 비어 있으면 켤 수 없어요." }, { status: 400 });
  }

  const res = await adminFetch("event_settings?on_conflict=event_slug", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      event_slug: slug,
      confirm_sms_enabled: body.enabled,
      confirm_sms_template: template,
      updated_at: new Date().toISOString(),
      updated_by: session.nickname ?? session.userId,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `저장 실패: ${text || res.status}` }, { status: 500 });
  }
  const [row] = await res.json();
  return NextResponse.json({ success: true, settings: row });
}

/** POST — 테스트 발송. body: { phone, template } — 실제 문자가 나간다 */
export async function POST(req: Request) {
  const { error } = await guard();
  if (error) return error;

  let body: { phone?: unknown; template?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (!/^01\d{8,9}$/.test(phone)) {
    return NextResponse.json({ error: "휴대폰 번호를 확인해주세요." }, { status: 400 });
  }
  const template = typeof body.template === "string" ? body.template : "";
  if (!template.trim() || template.length > MAX_TEMPLATE) {
    return NextResponse.json({ error: "문구를 확인해주세요." }, { status: 400 });
  }

  // 문자 키(SENS)는 Supabase 함수에만 있다 — service role 키로 event-signup 의 sms_test 호출
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/event-signup`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ action: "sms_test", phone, template }),
      cache: "no-store",
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: data?.error ?? `발송 실패 (${res.status})` }, { status: 502 });
  }
  if (data?.skipped) {
    return NextResponse.json({ error: "이 서버에는 문자 발송 키가 없어요 (개발 서버)." }, { status: 400 });
  }
  if (!data?.ok) {
    return NextResponse.json({ error: `발송 실패: ${data?.detail ?? "알 수 없음"}` }, { status: 502 });
  }
  return NextResponse.json({ success: true, type: data.type });
}
