import { NextResponse } from "next/server";
import { isValidKoreanMobile, normalizePhone, toE164 } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const GENERIC_OK = NextResponse.json({ success: true });

export async function POST(req: Request) {
  if (!SUPABASE_URL || !ANON_KEY) {
    return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
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

  const phoneE164 = toE164(digits);
  const otpRes = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: phoneE164,
      // 신규 유저도 auth.users 자동 생성 → 이후 profiles trigger 로 프로필 생성 (기존 정책 그대로)
      create_user: true,
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

  return GENERIC_OK;
}
