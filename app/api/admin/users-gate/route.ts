import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import {
  USERS_GATE_COOKIE,
  USERS_GATE_PASSWORD,
  USERS_GATE_TTL_SEC,
} from "@/app/admin/(authed)/users/gate-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let password: string;
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  if (password !== USERS_GATE_PASSWORD) {
    return NextResponse.json(
      { error: "비밀번호가 일치하지 않아요." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(USERS_GATE_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin/users",
    maxAge: USERS_GATE_TTL_SEC,
  });
  return res;
}
