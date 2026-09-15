import { NextResponse } from "next/server";
import { isValidKoreanMobile, normalizePhone, toE164 } from "@/lib/phone";
import {
  TOOL_COOKIE,
  TOOL_SESSION_TTL_MS,
  signToolSession,
  type ToolSession,
} from "@/lib/tool-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function POST(req: Request) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
  }

  let phoneInput: string;
  let code: string;
  try {
    const body = await req.json();
    phoneInput = String(body?.phone ?? "");
    code = String(body?.code ?? "").trim();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const digits = normalizePhone(phoneInput);
  if (!isValidKoreanMobile(digits) || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "휴대폰 번호와 6자리 인증번호를 확인해주세요." },
      { status: 400 }
    );
  }

  const phoneE164 = toE164(digits);
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: phoneE164,
      token: code,
      type: "sms",
    }),
  });
  if (!verifyRes.ok) {
    return NextResponse.json(
      { error: "인증번호가 일치하지 않거나 만료됐어요." },
      { status: 401 }
    );
  }
  const verifyData = (await verifyRes.json()) as {
    user?: { id?: string };
    access_token?: string;
  };
  const userId = verifyData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "사용자 확인 실패" }, { status: 401 });
  }

  // Supabase Auth 임시 세션 즉시 폐기 (tool 자체 쿠키 사용)
  if (verifyData.access_token) {
    fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${verifyData.access_token}`,
      },
    }).catch(() => {});
  }

  // profiles 에서 닉네임 조회 (없으면 전화번호로 임시)
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=nickname,phone_number&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    }
  );
  const profs = profRes.ok
    ? ((await profRes.json()) as Array<{
        nickname: string | null;
        phone_number: string | null;
      }>)
    : [];
  const nickname = profs[0]?.nickname?.trim() || digits;

  const session: ToolSession = {
    userId,
    nickname,
    phoneNumber: digits,
    exp: Date.now() + TOOL_SESSION_TTL_MS,
  };

  const cookieValue = signToolSession(session);
  const res = NextResponse.json({ success: true, nickname });
  res.cookies.set(TOOL_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.exp),
    maxAge: Math.floor(TOOL_SESSION_TTL_MS / 1000),
  });
  return res;
}
