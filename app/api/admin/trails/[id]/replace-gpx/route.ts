import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import {
  prepareTrailFromText,
  mergeMultiGeometry,
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
  fileText: string,
  contentType: string
): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${TRAIL_GPX_STORAGE_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: fileText,
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Storage upload failed (${res.status}): ${text}`);
  }
}

async function deleteFromStorage(storagePath: string): Promise<void> {
  await fetch(
    `${SUPABASE_URL}/storage/v1/object/${TRAIL_GPX_STORAGE_BUCKET}/${storagePath}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
    }
  ).catch(() => undefined);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "trails")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
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

  // 다중 files 우선 지원, 하위호환으로 단일 file 도 허용
  const rawFiles: File[] = [];
  for (const v of form.getAll("files")) {
    if (v instanceof File && v.size > 0) rawFiles.push(v);
  }
  if (rawFiles.length === 0) {
    const single = form.get("file");
    if (single instanceof File && single.size > 0) rawFiles.push(single);
  }
  if (rawFiles.length === 0) {
    return NextResponse.json(
      { error: "GPX 또는 KML 파일을 첨부해주세요." },
      { status: 400 }
    );
  }
  for (const f of rawFiles) {
    const n = f.name.toLowerCase();
    if (!n.endsWith(".gpx") && !n.endsWith(".kml")) {
      return NextResponse.json(
        { error: `지원하지 않는 형식: ${f.name}` },
        { status: 400 }
      );
    }
  }
  const isKml = rawFiles[0].name.toLowerCase().endsWith(".kml");
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

  // 3) 파싱 (GPX/KML 자동 판별) — 여러 파일이면 병합
  let preps: { fileName: string; text: string; prep: PreparedTrailGeometry }[];
  try {
    preps = await Promise.all(
      rawFiles.map(async (f) => {
        const text = await f.text();
        return { fileName: f.name, text, prep: prepareTrailFromText(text) };
      })
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "파일 파싱 실패";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const merged =
    preps.length > 1
      ? mergeMultiGeometry(preps.map((p) => p.prep))
      : {
          bounds: preps[0].prep.bounds,
          center: preps[0].prep.center,
          coordinates: preps[0].prep.coordinates,
          distanceKm: preps[0].prep.distanceKm,
          totalAscentM: preps[0].prep.totalAscentM,
        };
  const primaryText = preps[0].text;

  // 4) Storage 업로드 — 새 파일 확장자에 맞춰 저장 경로 재구성.
  //    이전 파일이 다른 확장자였다면 잔여물 정리.
  const newExt = isKml ? "kml" : "gpx";
  const oldPath = trail.gpx_storage_path;
  const oldExt = oldPath?.toLowerCase().endsWith(".kml")
    ? "kml"
    : oldPath?.toLowerCase().endsWith(".gpx")
      ? "gpx"
      : null;
  const baseNoExt = oldPath?.replace(/\.(gpx|kml)$/i, "");
  const storagePath = baseNoExt
    ? `${baseNoExt}.${newExt}`
    : `${ADMIN_UPLOADER_PROFILE_ID}/${id}.${newExt}`;
  const contentType = isKml
    ? "application/vnd.google-earth.kml+xml"
    : "application/gpx+xml";
  try {
    await uploadGpxToStorage(storagePath, primaryText, contentType);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Storage 업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  // 확장자가 바뀌었으면 이전 파일 정리 (best-effort)
  if (oldPath && oldExt && oldExt !== newExt && oldPath !== storagePath) {
    await deleteFromStorage(oldPath);
  }

  // 5) trails 업데이트
  const update: Record<string, unknown> = {
    distance_km: merged.distanceKm,
    total_ascent_m: merged.totalAscentM,
    bounds: merged.bounds,
    center: merged.center,
    coordinates: merged.coordinates,
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
      distance_km: merged.distanceKm,
      total_ascent_m: merged.totalAscentM,
    },
    files: preps.length,
  });
}
