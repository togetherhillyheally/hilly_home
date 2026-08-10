import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** 관리자 환불 — toss-cancel-payment Edge Function 의 admin_refund 모드 호출 */
export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "settlements")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!body.orderId) {
    return NextResponse.json({ error: "orderId 가 필요합니다." }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/toss-cancel-payment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode: "admin_refund", orderId: body.orderId }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? `환불 실패 (${res.status})` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
