import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import {
  prepareTrailFromGpxText,
  type PreparedTrailGeometry,
} from "@/lib/gpx-prep";
import {
  TRAIL_GPX_STORAGE_BUCKET,
  ADMIN_UPLOADER_PROFILE_ID,
} from "@/lib/trail-upload-constants";
import { requestTrailThumbnail } from "@/lib/trail-thumbnail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function uploadGpxToStorage(
  storagePath: string,
  gpxText: string
): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${TRAIL_GPX_STORAGE_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "application/gpx+xml",
        "x-upsert": "true",
      },
      body: gpxText,
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Storage upload failed (${res.status}): ${text}`);
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;

  // 1) FormData 검증
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식 (multipart/form-data 필요)" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "GPX 파일을 첨부해주세요." },
      { status: 400 }
    );
  }
  const resetStartEnd = String(form.get("reset_start_end") ?? "") === "true";

  // 2) 기존 trail 조회 — 기존 storage path 활용
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
      { error: "존재하지 않는 지도입니다." },
      { status: 404 }
    );
  }

  // 3) GPX 파싱
  let prep: PreparedTrailGeometry;
  let gpxText: string;
  try {
    gpxText = await file.text();
    prep = prepareTrailFromGpxText(gpxText);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "GPX 파싱 실패";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 4) Storage 업로드 — 기존 path 가 있으면 그대로 덮어쓰기,
  //    없으면 표준 경로(adminId/trailId.gpx)로 신규 저장.
  const storagePath =
    trail.gpx_storage_path ?? `${ADMIN_UPLOADER_PROFILE_ID}/${id}.gpx`;
  try {
    await uploadGpxToStorage(storagePath, gpxText);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Storage 업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // 5) trails 업데이트
  const update: Record<string, unknown> = {
    distance_km: prep.distanceKm,
    total_ascent_m: prep.totalAscentM,
    bounds: prep.bounds,
    center: prep.center,
    coordinates: prep.coordinates,
    gpx_storage_bucket: TRAIL_GPX_STORAGE_BUCKET,
    gpx_storage_path: storagePath,
    updated_at: new Date().toISOString(),
  };
  if (resetStartEnd) {
    update.start_lat = null;
    update.start_lng = null;
    update.end_lat = null;
    update.end_lng = null;
  }

  const upRes = await adminFetch(`trails?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(update),
  });
  if (!upRes.ok) {
    const text = await upRes.text().catch(() => "");
    return NextResponse.json(
      { error: `DB 업데이트 실패 (${upRes.status}): ${text}` },
      { status: 500 }
    );
  }

  // 경로가 바뀌었으니 썸네일 재생성 (Edge Function, 비차단)
  await requestTrailThumbnail(id);

  return NextResponse.json({
    success: true,
    trail: {
      distance_km: prep.distanceKm,
      total_ascent_m: prep.totalAscentM,
    },
  });
}
