import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_FIELDS = new Set([
  "name",
  "category",
  "season",
  "sort_order",
  "unlock_cost",
  "design_key",
]);

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (k === "name" || k === "category") {
      if (typeof v !== "string" || !v.trim()) {
        return NextResponse.json(
          { error: `${k === "name" ? "이름" : "카테고리"}은 비울 수 없습니다.` },
          { status: 400 }
        );
      }
      update[k] = v.trim();
    } else if (k === "season" || k === "design_key") {
      update[k] = typeof v === "string" && v.trim() ? v.trim() : null;
    } else if (k === "sort_order" || k === "unlock_cost") {
      if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) {
        return NextResponse.json(
          { error: `${k} 값이 올바르지 않습니다.` },
          { status: 400 }
        );
      }
      if (k === "unlock_cost" && v < 0) {
        return NextResponse.json(
          { error: "unlock_cost 는 0 이상이어야 합니다." },
          { status: 400 }
        );
      }
      update[k] = v;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "변경할 항목이 없습니다." },
      { status: 400 }
    );
  }

  const res = await adminFetch(`basecamp_objects?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `업데이트 실패 (${res.status}): ${text}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

// DELETE — 오브젝트 + 이미지 일괄 삭제
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;

  // 1) row 조회 → storage_path 확보
  const r = await adminFetch(
    `basecamp_objects?select=storage_path&id=eq.${id}`
  );
  if (!r.ok) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
  const arr = (await r.json()) as { storage_path: string | null }[];
  const obj = arr[0];
  if (!obj) {
    return NextResponse.json(
      { error: "이미 삭제되었거나 존재하지 않는 오브젝트입니다." },
      { status: 404 }
    );
  }

  // 2) Storage 정리
  if (obj.storage_path) {
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/basecamp-assets/${obj.storage_path}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      }
    ).catch(() => {});
  }

  // 3) row DELETE
  const delRes = await adminFetch(`basecamp_objects?id=eq.${id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!delRes.ok) {
    const text = await delRes.text().catch(() => "");
    return NextResponse.json(
      { error: `삭제 실패 (${delRes.status}): ${text}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
