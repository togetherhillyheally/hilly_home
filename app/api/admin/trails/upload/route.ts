import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import {
  prepareTrailFromText,
  displayNameFromFileName,
  mergeMultiGeometry,
  type PreparedTrailGeometry,
} from "@/lib/gpx-prep";
import {
  TRAIL_GPX_STORAGE_BUCKET,
  ADMIN_UPLOADER_PROFILE_ID,
} from "@/lib/trail-upload-constants";
import { requestTrailThumbnail } from "@/lib/trail-thumbnail";
import { adminFetch } from "@/lib/admin-rest";
import { DEFAULT_MARKER_ICON } from "@/lib/checkpoint-constants";
import {
  DEFAULT_TREASURE_COUNT,
  DEFAULT_TREASURE_REWARD_POOL,
  validateTreasureCount,
  validateTreasureRewardPool,
} from "@/lib/trail-treasure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type ActivityType = "walking" | "running" | "cycling";

async function uploadGpxToStorage(
  storagePath: string,
  fileText: string,
  contentType: string = "application/gpx+xml"
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

async function removeGpxFromStorage(storagePath: string): Promise<void> {
  await fetch(
    `${SUPABASE_URL}/storage/v1/object/${TRAIL_GPX_STORAGE_BUCKET}/${storagePath}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
    }
  ).catch(() => {});
}

async function getNextSortOrder(): Promise<number> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/trails?select=sort_order&created_by=not.is.null&order=sort_order.desc&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return 1;
  const rows = (await res.json()) as { sort_order: number | null }[];
  const cur = rows?.[0]?.sort_order ?? 0;
  return cur + 1;
}

async function insertTrailRow(row: Record<string, unknown>): Promise<{
  id: string;
  name: string;
}> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/trails?select=id,name`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`trails INSERT failed (${res.status}): ${text}`);
  }
  const arr = (await res.json()) as { id: string; name: string }[];
  return arr[0];
}

export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "trails")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식 (multipart/form-data 필요)" },
      { status: 400 }
    );
  }

  const fileEntries = form.getAll("files");
  const files: File[] = fileEntries.filter(
    (f): f is File => f instanceof File && f.size > 0
  );
  if (files.length === 0) {
    return NextResponse.json(
      { error: "GPX 파일을 1개 이상 첨부해주세요." },
      { status: 400 }
    );
  }

  const displayNameRaw = String(form.get("name") ?? "").trim();
  const seriesNameRaw = String(form.get("series_name") ?? "").trim();
  const activityTypesRaw = String(form.get("activity_types") ?? "walking,running");
  const activityTypes = activityTypesRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ActivityType =>
      s === "walking" || s === "running" || s === "cycling"
    );

  // 1) 파싱 (GPX / KML 자동 판별)
  let preps: { fileName: string; gpxText: string; prep: PreparedTrailGeometry }[];
  try {
    preps = await Promise.all(
      files.map(async (f) => {
        const gpxText = await f.text();
        const prep = prepareTrailFromText(gpxText);
        return { fileName: f.name, gpxText, prep };
      })
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "파일 파싱 실패";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 2) 표시 이름 결정
  const displayName =
    displayNameRaw ||
    preps[0].prep.nameFromGpx ||
    displayNameFromFileName(preps[0].fileName);

  // 3) 단일/다중 분기
  const isMultiUpload = preps.length > 1;
  const merged = isMultiUpload
    ? mergeMultiGeometry(preps.map((p) => p.prep))
    : {
        bounds: preps[0].prep.bounds,
        center: preps[0].prep.center,
        coordinates: preps[0].prep.coordinates,
        distanceKm: preps[0].prep.distanceKm,
        totalAscentM: preps[0].prep.totalAscentM,
      };

  // 4) Storage 업로드 (다중일 때 첫 파일만 보관 — hilly_rn 패턴).
  //    원본 확장자 유지 (.gpx 또는 .kml) 로 downstream 파싱 시 형식 판별 가능.
  const trailId = randomUUID();
  const firstExt = preps[0].fileName.toLowerCase().endsWith(".kml")
    ? "kml"
    : "gpx";
  const storagePath = `${ADMIN_UPLOADER_PROFILE_ID}/${trailId}.${firstExt}`;
  const contentType =
    firstExt === "kml" ? "application/vnd.google-earth.kml+xml" : "application/gpx+xml";
  try {
    await uploadGpxToStorage(storagePath, preps[0].gpxText, contentType);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Storage 업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // 5) trails INSERT
  const sortOrder = await getNextSortOrder();
  const rawMapType = String(form.get("map_type") ?? "adventure");
  const map_type =
    rawMapType === "treasure" || rawMapType === "stamp" || rawMapType === "adventure"
      ? rawMapType
      : "adventure";
  const row: Record<string, unknown> = {
    id: trailId,
    name: displayName,
    day: null,
    map_type,
    gpx_storage_bucket: TRAIL_GPX_STORAGE_BUCKET,
    gpx_storage_path: storagePath,
    distance_km: merged.distanceKm,
    total_ascent_m: merged.totalAscentM,
    bounds: merged.bounds,
    center: merged.center,
    coordinates: merged.coordinates,
    sort_order: sortOrder,
    created_by: ADMIN_UPLOADER_PROFILE_ID,
    source: "upload",
    activity_types:
      activityTypes.length > 0 ? activityTypes : ["walking", "running"],
    series_name: seriesNameRaw || null,
  };

  if (map_type === "treasure") {
    const rawCount = form.get("treasure_count");
    const rawPool = form.get("treasure_reward_pool");

    let countValue: number = DEFAULT_TREASURE_COUNT;
    if (rawCount != null && String(rawCount).length > 0) {
      const cr = validateTreasureCount(Number(rawCount));
      if (!cr.ok) {
        await removeGpxFromStorage(storagePath);
        return NextResponse.json({ error: cr.message }, { status: 400 });
      }
      countValue = cr.value;
    }

    let poolValue = DEFAULT_TREASURE_REWARD_POOL.map((r) => ({ ...r }));
    if (rawPool != null && String(rawPool).length > 0) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(rawPool));
      } catch {
        await removeGpxFromStorage(storagePath);
        return NextResponse.json(
          { error: "treasure_reward_pool JSON 파싱 실패" },
          { status: 400 }
        );
      }
      const pr = validateTreasureRewardPool(parsed);
      if (!pr.ok) {
        await removeGpxFromStorage(storagePath);
        return NextResponse.json({ error: pr.message }, { status: 400 });
      }
      poolValue = pr.value;
    }

    row.treasure_count = countValue;
    row.treasure_reward_pool = poolValue;
  }

  let inserted: { id: string; name: string };
  try {
    inserted = await insertTrailRow(row);
  } catch (e: unknown) {
    await removeGpxFromStorage(storagePath);
    const msg = e instanceof Error ? e.message : "DB INSERT 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // GPX 웨이포인트 → 체크포인트 (실패해도 지도는 이미 만들어짐 — 경고만)
  let checkpointError: string | null = null;
  const rawWaypoints = form.get("waypoints");
  if (rawWaypoints != null && String(rawWaypoints).length > 0) {
    try {
      const parsed = JSON.parse(String(rawWaypoints)) as unknown;
      const items = (Array.isArray(parsed) ? parsed : [])
        .map((w) => w as { title?: unknown; lat?: unknown; lng?: unknown })
        .filter(
          (w) =>
            typeof w.lat === "number" &&
            Number.isFinite(w.lat) &&
            typeof w.lng === "number" &&
            Number.isFinite(w.lng)
        )
        .slice(0, 500);
      if (items.length > 0) {
        const nowIso = new Date().toISOString();
        const res = await adminFetch("trail_checkpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            items.map((w, i) => ({
              id: randomUUID(),
              trail_id: inserted.id,
              sort_order: i + 1,
              title:
                (typeof w.title === "string" && w.title.trim().slice(0, 100)) ||
                `체크포인트 ${i + 1}`,
              lng: w.lng,
              lat: w.lat,
              marker_icon: DEFAULT_MARKER_ICON,
              created_by: ADMIN_UPLOADER_PROFILE_ID,
              created_at: nowIso,
              updated_at: nowIso,
            }))
          ),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => ""));
      }
    } catch {
      checkpointError =
        "지도는 만들었지만 웨이포인트를 체크포인트로 옮기지 못했어요. 체크포인트 화면에서 추가해 주세요.";
    }
  }

  // 경로 썸네일 생성 (Edge Function, 비차단 — 실패해도 업로드는 성공)
  await requestTrailThumbnail(inserted.id);

  return NextResponse.json({
    success: true,
    checkpoint_error: checkpointError,
    trail: {
      id: inserted.id,
      name: inserted.name,
      distance_km: merged.distanceKm,
      total_ascent_m: merged.totalAscentM,
    },
  });
}
