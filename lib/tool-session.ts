/**
 * Tool 페이지(예: /tools/dongseo-survey) 용 경량 로그인 세션.
 * 어드민 세션과 완전 분리 — 일반 유저(admin_tier null 포함) 모두 phone OTP 로 로그인.
 * 저장: signed cookie (HMAC-SHA256). DB 테이블 없음.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SIGNING_SECRET =
  process.env.TOOL_SESSION_SECRET ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "";

export const TOOL_COOKIE = "hh_tool_session";
export const TOOL_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export type ToolSession = {
  userId: string;
  nickname: string;
  phoneNumber: string;
  exp: number; // ms
};

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  return Buffer.from(pad ? padded + "=".repeat(4 - pad) : padded, "base64");
}

export function signToolSession(session: ToolSession): string {
  if (!SIGNING_SECRET) throw new Error("TOOL_SESSION_SECRET 미설정");
  const payload = base64url(JSON.stringify(session));
  const sig = base64url(
    createHmac("sha256", SIGNING_SECRET).update(payload).digest()
  );
  return `${payload}.${sig}`;
}

export function verifyToolCookie(cookieValue: string): ToolSession | null {
  if (!SIGNING_SECRET || !cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = base64url(
    createHmac("sha256", SIGNING_SECRET).update(payload).digest()
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  let parsed: ToolSession;
  try {
    parsed = JSON.parse(base64urlDecode(payload).toString("utf8")) as ToolSession;
  } catch {
    return null;
  }
  if (!parsed.userId || !parsed.exp || parsed.exp < Date.now()) return null;
  return parsed;
}

/** 서버 컴포넌트·라우트 핸들러에서 현재 tool 세션 읽기 */
export async function readToolSession(): Promise<ToolSession | null> {
  const store = await cookies();
  const raw = store.get(TOOL_COOKIE)?.value;
  if (!raw) return null;
  return verifyToolCookie(raw);
}
