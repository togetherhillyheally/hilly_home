import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TARGET_FIELD: Record<string, string | null> = {
  all: null,
  super: "is_super_admin",
  puzzle: "is_puzzle_admin",
  host: "is_host_verified",
  tester: "is_tester",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function chunked<T, R>(
  items: T[],
  size: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    const results = await Promise.all(slice.map(worker));
    out.push(...results);
  }
  return out;
}

export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: {
    target?: string;
    customUserIds?: string[];
    type?: string;
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const target = body.target ?? "";
  const type = (body.type ?? "").trim();
  const title = (body.title ?? "").trim();
  const messageBody = (body.body ?? "").trim() || undefined;

  if (!type || !title) {
    return NextResponse.json(
      { error: "type과 title은 필수예요." },
      { status: 400 }
    );
  }
  if (title.length > 200 || type.length > 50) {
    return NextResponse.json(
      { error: "type/title 길이가 너무 깁니다." },
      { status: 400 }
    );
  }

  // 1) 대상 user_id 모으기
  let userIds: string[] = [];
  if (target === "specific") {
    const ids = Array.isArray(body.customUserIds) ? body.customUserIds : [];
    userIds = ids
      .map((s) => String(s).trim())
      .filter((s) => UUID_RE.test(s));
    if (userIds.length === 0) {
      return NextResponse.json(
        { error: "유효한 user_id가 없어요." },
        { status: 400 }
      );
    }
  } else if (target in TARGET_FIELD) {
    const field = TARGET_FIELD[target];
    const params = new URLSearchParams({ select: "id" });
    if (field) params.set(field, "eq.true");
    const res = await adminFetch(`profiles?${params.toString()}`);
    if (!res.ok) {
      return NextResponse.json(
        { error: "대상 조회 실패" },
        { status: 500 }
      );
    }
    const rows = (await res.json()) as Array<{ id: string }>;
    userIds = rows.map((r) => r.id);
  } else {
    return NextResponse.json(
      { error: "알 수 없는 대상 그룹" },
      { status: 400 }
    );
  }

  if (userIds.length === 0) {
    return NextResponse.json(
      { error: "발송 대상이 없어요." },
      { status: 400 }
    );
  }

  // 2) send-notification Edge Function 청크 단위 호출
  const endpoint = `${SUPABASE_URL}/functions/v1/send-notification`;
  type FnRes =
    | { ok: true; pushed: boolean; reason?: string }
    | { error: string };

  const results = await chunked(userIds, 20, async (uid) => {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userId: uid,
          type,
          title,
          body: messageBody,
          data: body.data ?? null,
        }),
      });
      if (!r.ok) {
        return { ok: false as const };
      }
      const j = (await r.json().catch(() => ({}))) as FnRes;
      if ("error" in j) return { ok: false as const };
      return {
        ok: true as const,
        pushed: j.pushed,
        reason: j.reason,
      };
    } catch {
      return { ok: false as const };
    }
  });

  const summary = {
    total: results.length,
    pushed: results.filter((r) => r.ok && r.pushed).length,
    saved_only: results.filter(
      (r) => r.ok && !r.pushed && r.reason === "no_token"
    ).length,
    failed: results.filter((r) => !r.ok).length,
  };

  return NextResponse.json({ success: true, summary });
}
