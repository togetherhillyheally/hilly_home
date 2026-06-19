import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SCALAR_FIELDS = new Set([
  "is_active",
  "sort_order",
  "name",
  "series_name",
]);

const COORD_FIELDS = new Set([
  "start_lat",
  "start_lng",
  "end_lat",
  "end_lng",
]);

type ActivityType = "walking" | "running" | "cycling";

function sanitizeActivityTypes(input: unknown): ActivityType[] | null {
  if (!Array.isArray(input)) return null;
  const valid = input.filter(
    (t): t is ActivityType =>
      t === "walking" || t === "running" || t === "cycling"
  );
  return valid.length > 0 ? valid : null;
}

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
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!SCALAR_FIELDS.has(k)) continue;
    if (k === "name" && typeof v === "string" && !v.trim()) {
      return NextResponse.json(
        { error: "이름은 비울 수 없습니다." },
        { status: 400 }
      );
    }
    if (k === "name" && typeof v === "string") {
      update[k] = v.trim();
    } else if (k === "series_name") {
      update[k] = typeof v === "string" && v.trim() ? v.trim() : null;
    } else {
      update[k] = v;
    }
  }

  if ("activity_types" in body) {
    const arr = sanitizeActivityTypes(body.activity_types);
    update.activity_types = arr;
  }

  // 시작/끝 좌표 — null 허용(자동 리셋), 숫자만 통과
  for (const k of COORD_FIELDS) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v === null) {
      update[k] = null;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      update[k] = v;
    } else {
      return NextResponse.json(
        { error: `${k} 값이 올바르지 않습니다.` },
        { status: 400 }
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "변경할 필드가 없어요." },
      { status: 400 }
    );
  }
  update.updated_at = new Date().toISOString();

  const res = await adminFetch(`trails?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
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

// DELETE — 트레일 + 체크포인트 사진 + GPX 원본 일괄 정리
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;

  // 1) trail 조회
  const trailRes = await adminFetch(
    `trails?select=id,gpx_storage_bucket,gpx_storage_path&id=eq.${id}`
  );
  if (!trailRes.ok) {
    return NextResponse.json(
      { error: "트레일 조회 실패" },
      { status: 500 }
    );
  }
  const trails = (await trailRes.json()) as {
    id: string;
    gpx_storage_bucket: string | null;
    gpx_storage_path: string | null;
  }[];
  const trail = trails[0];
  if (!trail) {
    return NextResponse.json(
      { error: "이미 삭제되었거나 존재하지 않는 지도입니다." },
      { status: 404 }
    );
  }

  // 2) 체크포인트 사진 Storage 정리
  const cpRes = await adminFetch(
    `trail_checkpoints?select=id&trail_id=eq.${id}`
  );
  if (cpRes.ok) {
    const cps = (await cpRes.json()) as { id: string }[];
    const cpIds = cps.map((c) => c.id);
    if (cpIds.length > 0) {
      const photoRes = await adminFetch(
        `trail_checkpoint_photos?select=storage_bucket,storage_path&checkpoint_id=in.(${cpIds.join(
          ","
        )})`
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
    }
  }

  // 3) GPX 원본 Storage 정리
  if (trail.gpx_storage_bucket && trail.gpx_storage_path) {
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${trail.gpx_storage_bucket}/${trail.gpx_storage_path}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      }
    ).catch(() => {});
  }

  // 4) trails row DELETE — 자식 행은 외래키 CASCADE/RLS에 의존
  const delRes = await adminFetch(`trails?id=eq.${id}`, {
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
