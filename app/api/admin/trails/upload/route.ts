import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readAdminSession } from "@/lib/admin-session";
import {
  prepareTrailFromGpxText,
  displayNameFromFileName,
  type PreparedTrailGeometry,
} from "@/lib/gpx-prep";
import {
  TRAIL_GPX_STORAGE_BUCKET,
  ADMIN_UPLOADER_PROFILE_ID,
} from "@/lib/trail-upload-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type ActivityType = "walking" | "running" | "cycling";

type Coord = [number, number] | [number, number, number];

function isMultiCoords(coords: PreparedTrailGeometry["coordinates"]): coords is Coord[][] {
  return (
    coords.length > 0 &&
    Array.isArray(coords[0]) &&
    (coords[0] as unknown[]).length > 0 &&
    Array.isArray((coords[0] as unknown[])[0])
  );
}

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

function mergeMulti(
  preps: PreparedTrailGeometry[]
): {
  bounds: PreparedTrailGeometry["bounds"];
  center: [number, number];
  coordinates: Coord[][];
  distanceKm: number;
  totalAscentM: number;
} {
  const bounds = preps.reduce(
    (acc, p) => ({
      minLat: Math.min(acc.minLat, p.bounds.minLat),
      maxLat: Math.max(acc.maxLat, p.bounds.maxLat),
      minLon: Math.min(acc.minLon, p.bounds.minLon),
      maxLon: Math.max(acc.maxLon, p.bounds.maxLon),
    }),
    preps[0].bounds
  );
  const center: [number, number] = [
    (bounds.minLon + bounds.maxLon) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];
  const distanceKm =
    Math.round(preps.reduce((s, p) => s + p.distanceKm, 0) * 10) / 10;
  const totalAscentM = Math.round(
    preps.reduce((s, p) => s + p.totalAscentM, 0)
  );
  // 각 prep 의 coordinates 가 LineString or MultiLineString. 모두 평탄화해서
  // 최종 결과는 항상 LineString[][] (MultiLineString)
  const coordinates: Coord[][] = preps.flatMap((p) =>
    isMultiCoords(p.coordinates) ? p.coordinates : [p.coordinates as Coord[]]
  );
  return { bounds, center, coordinates, distanceKm, totalAscentM };
}

export async function POST(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
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

  // 1) 파싱
  let preps: { fileName: string; gpxText: string; prep: PreparedTrailGeometry }[];
  try {
    preps = await Promise.all(
      files.map(async (f) => {
        const gpxText = await f.text();
        const prep = prepareTrailFromGpxText(gpxText);
        return { fileName: f.name, gpxText, prep };
      })
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "GPX 파싱 실패";
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
    ? mergeMulti(preps.map((p) => p.prep))
    : {
        bounds: preps[0].prep.bounds,
        center: preps[0].prep.center,
        coordinates: preps[0].prep.coordinates,
        distanceKm: preps[0].prep.distanceKm,
        totalAscentM: preps[0].prep.totalAscentM,
      };

  // 4) Storage 업로드 (다중일 때 첫 파일만 보관 — hilly_rn 패턴)
  const trailId = randomUUID();
  const storagePath = `${ADMIN_UPLOADER_PROFILE_ID}/${trailId}.gpx`;
  try {
    await uploadGpxToStorage(storagePath, preps[0].gpxText);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Storage 업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // 5) trails INSERT
  const sortOrder = await getNextSortOrder();
  const row = {
    id: trailId,
    name: displayName,
    day: null,
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

  let inserted: { id: string; name: string };
  try {
    inserted = await insertTrailRow(row);
  } catch (e: unknown) {
    await removeGpxFromStorage(storagePath);
    const msg = e instanceof Error ? e.message : "DB INSERT 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    trail: {
      id: inserted.id,
      name: inserted.name,
      distance_km: merged.distanceKm,
      total_ascent_m: merged.totalAscentM,
    },
  });
}
