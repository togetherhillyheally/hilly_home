import { NextResponse } from "next/server";
import { isValidKoreanMobile, normalizePhone, toE164 } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// 어드민 enumeration 방지 — 비-슈퍼어드민이어도 동일한 "전송됨" 응답을 주되 실제론 발송 X
const GENERIC_OK = NextResponse.json({ success: true });

export async function POST(req: Request) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    return NextResponse.json(
      { error: "서버 설정 오류" },
      { status: 500 }
    );
  }

  let phoneInput: string;
  try {
    const body = await req.json();
    phoneInput = String(body?.phone ?? "");
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const digits = normalizePhone(phoneInput);
  if (!isValidKoreanMobile(digits)) {
    return NextResponse.json(
      { error: "올바른 휴대폰 번호를 입력해주세요." },
      { status: 400 }
    );
  }

  // admin_tier 확인 — null 이면 BO 접근 불가 (일반 유저)
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?phone_number=eq.${digits}&select=id,admin_tier&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    }
  );
  if (!profRes.ok) {
    return NextResponse.json({ error: "조회 오류" }, { status: 500 });
  }
  const profs = (await profRes.json()) as Array<{
    id: string;
    admin_tier: string | null;
  }>;
  const prof = profs[0];

  if (!prof || !prof.admin_tier) {
    // 일반 사용자/미가입 — 발송 안 하고 동일 응답
    return GENERIC_OK;
  }

  const phoneE164 = toE164(digits);
  const otpRes = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: phoneE164,
      create_user: false,
      channel: "sms",
    }),
  });

  if (!otpRes.ok) {
    const text = await otpRes.text().catch(() => "");
    if (otpRes.status === 429 || /security purposes|after/i.test(text)) {
      return NextResponse.json(
        { error: "잠시 후 다시 시도해주세요. (1분 제한)" },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "인증번호 전송에 실패했어요." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
