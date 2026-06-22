import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: { from?: unknown; to?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const from = typeof body.from === "string" ? body.from.trim() : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";

  if (!from) {
    return NextResponse.json(
      { error: "기존 시리즈명이 필요합니다." },
      { status: 400 }
    );
  }
  if (!to) {
    return NextResponse.json(
      { error: "새 시리즈명을 입력해주세요." },
      { status: 400 }
    );
  }
  if (from === to) {
    return NextResponse.json(
      { error: "기존 이름과 새 이름이 같아요." },
      { status: 400 }
    );
  }

  const encodedFrom = encodeURIComponent(from);

  const countRes = await adminFetch(
    `trails?select=id&series_name=eq.${encodedFrom}`,
    { headers: { Prefer: "count=exact", Range: "0-0" } }
  );
  if (!countRes.ok) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
  const range = countRes.headers.get("content-range");
  const matched = range ? Number(range.split("/")[1]) || 0 : 0;
  if (matched === 0) {
    return NextResponse.json(
      { error: `"${from}" 시리즈를 사용하는 지도가 없어요.` },
      { status: 404 }
    );
  }

  const updateRes = await adminFetch(
    `trails?series_name=eq.${encodedFrom}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        series_name: to,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!updateRes.ok) {
    const text = await updateRes.text().catch(() => "");
    return NextResponse.json(
      { error: `업데이트 실패 (${updateRes.status}): ${text}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, updated: matched });
}
