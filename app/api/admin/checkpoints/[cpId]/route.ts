import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_FIELDS = new Set([
  "title",
  "note",
  "lng",
  "lat",
  "marker_icon",
  "sort_order",
]);

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ cpId: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { cpId } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (k === "title") {
      if (typeof v !== "string" || !v.trim()) {
        return NextResponse.json(
          { error: "제목은 비울 수 없습니다." },
          { status: 400 }
        );
      }
      update.title = v.trim();
    } else if (k === "note") {
      update.note =
        typeof v === "string" && v.trim() ? v.trim() : null;
    } else if (k === "lng" || k === "lat") {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        return NextResponse.json(
          { error: `${k} 값이 올바르지 않습니다.` },
          { status: 400 }
        );
      }
      update[k] = v;
    } else if (k === "marker_icon") {
      if (typeof v !== "string" || !v.trim()) continue;
      update.marker_icon = v.trim();
    } else if (k === "sort_order") {
      if (typeof v !== "number" || !Number.isInteger(v)) continue;
      update.sort_order = v;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "변경할 항목이 없습니다." },
      { status: 400 }
    );
  }
  update.updated_at = new Date().toISOString();

  const res = await adminFetch(`trail_checkpoints?id=eq.${cpId}`, {
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

// DELETE — 체크포인트 + 첨부 사진(Storage + DB) 일괄 정리
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ cpId: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { cpId } = await ctx.params;

  // 1) 사진 조회 → Storage 정리
  const photoRes = await adminFetch(
    `trail_checkpoint_photos?select=storage_bucket,storage_path&checkpoint_id=eq.${cpId}`
  );
  if (photoRes.ok) {
    const photos = (await photoRes.json()) as {
      storage_bucket: string | null;
      storage_path: string | null;
    }[];
    const byBucket = new Map<string, string[]>();
    for (const p of photos) {
      if (!p.storage_bucket || !p.storage_path) continue;
      const arr = byBucket.get(p.storage_bucket) ?? [];
      arr.push(p.storage_path);
      byBucket.set(p.storage_bucket, arr);
    }
    for (const [bucket, paths] of byBucket) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: paths }),
      }).catch(() => {});
    }
  }

  // 2) checkpoint row DELETE — 사진 row 는 FK CASCADE 가정
  const delRes = await adminFetch(`trail_checkpoints?id=eq.${cpId}`, {
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
