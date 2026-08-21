import { NextResponse } from "next/server";
import { isValidKoreanMobile, normalizePhone, toE164 } from "@/lib/phone";
import {
  ADMIN_COOKIE,
  SESSION_TTL_MS,
  createAdminSession,
} from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const GENERIC_FAIL = NextResponse.json(
  { error: "인증에 실패했어요." },
  { status: 401 }
);

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

  // 개발 우회 — master 티어 & 코드 123456 이면 Supabase OTP 검증을 건너뛰고 폰번호로 user_id 조회
  const devBypass =
    process.env.NODE_ENV !== "production" && code === "123456";

  let userId: string | null = null;

  if (devBypass) {
    const byPhone = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?phone_number=eq.${digits}&select=id,admin_tier&limit=1`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        cache: "no-store",
      }
    );
    const profs = byPhone.ok
      ? ((await byPhone.json()) as Array<{
          id: string;
          admin_tier: string | null;
        }>)
      : [];
    const prof = profs[0];
    if (!prof || prof.admin_tier !== "master") {
      return NextResponse.json(
        { error: "인증번호가 일치하지 않거나 만료됐어요." },
        { status: 401 }
      );
    }
    userId = prof.id;
  } else {
    // 1) Supabase OTP 검증
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
    userId = verifyData.user?.id ?? null;
    if (!userId) return GENERIC_FAIL;

    // 2) Supabase Auth 세션 즉시 폐기 (웹은 자체 세션 사용)
    if (verifyData.access_token) {
      fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${verifyData.access_token}`,
        },
      }).catch(() => {});
    }

    // 3) admin_tier 재확인 (인증된 user_id 기준)
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=admin_tier&limit=1`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        cache: "no-store",
      }
    );
    const profs = profRes.ok
      ? ((await profRes.json()) as Array<{ admin_tier: string | null }>)
      : [];
    if (!profs[0]?.admin_tier) {
      return NextResponse.json(
        { error: "관리자 권한이 없는 계정이에요." },
        { status: 403 }
      );
    }
  }

  if (!userId) return GENERIC_FAIL;

  // 4) 어드민 세션 생성 + 쿠키 설정
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const { token, expiresAt } = await createAdminSession({
    userId,
    ip,
    userAgent,
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
