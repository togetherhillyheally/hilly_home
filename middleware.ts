import { NextRequest, NextResponse } from "next/server";

/**
 * 관리자 세션 쿠키의 maxAge/expires 를 요청마다 슬라이딩 갱신.
 * DB 쪽 expires_at 갱신은 lib/admin-session.ts::readAdminSession 이 처리.
 * 쿠키 존재 여부만 확인하고 재발급 — 실제 유효성은 페이지에서 readAdminSession 이 검증.
 */
const ADMIN_COOKIE = "hh_admin_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30일

export function middleware(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

export const config = {
  // /admin/* 페이지 진입에서만 실행 — API/정적 파일 제외
  matcher: ["/admin/:path*"],
};
