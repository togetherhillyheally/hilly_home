import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";
import { BASECAMP_ASSETS_BUCKET } from "@/lib/basecamp-object-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function extOfMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/svg+xml") return "svg";
  return "png";
}

async function uploadImage(
  storagePath: string,
  bytes: Uint8Array,
  contentType: string
): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BASECAMP_ASSETS_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: bytes,
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Storage upload failed (${res.status}): ${text}`);
  }
}

async function removeImage(storagePath: string): Promise<void> {
  await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BASECAMP_ASSETS_BUCKET}/${storagePath}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
    }
  ).catch(() => {});
}

// POST — 새 오브젝트 (FormData: image, name, category, season?, sort_order?, unlock_cost?, design_key?)
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

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "이미지 파일을 첨부해주세요." },
      { status: 400 }
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "이미지 파일만 업로드 가능합니다." },
      { status: 400 }
    );
  }

  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const season = String(form.get("season") ?? "").trim() || null;
  const designKey = String(form.get("design_key") ?? "").trim() || null;
  const sortOrderRaw = form.get("sort_order");
  const unlockCostRaw = form.get("unlock_cost");

  if (!name) {
    return NextResponse.json(
      { error: "이름을 입력해주세요." },
      { status: 400 }
    );
  }
  if (!category) {
    return NextResponse.json(
      { error: "카테고리를 입력해주세요." },
      { status: 400 }
    );
  }

  const sortOrder =
    typeof sortOrderRaw === "string" && sortOrderRaw.trim()
      ? parseInt(sortOrderRaw, 10)
      : 0;
  const unlockCost =
    typeof unlockCostRaw === "string" && unlockCostRaw.trim()
      ? parseInt(unlockCostRaw, 10)
      : 0;

  if (!Number.isFinite(sortOrder)) {
    return NextResponse.json(
      { error: "sort_order 값이 올바르지 않습니다." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(unlockCost) || unlockCost < 0) {
    return NextResponse.json(
      { error: "unlock_cost 값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const objectId = randomUUID();
  const ext = extOfMime(file.type);
  const storagePath = `${category}/${objectId}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    await uploadImage(storagePath, bytes, file.type);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Storage 업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const row = {
    id: objectId,
    name,
    category,
    season,
    storage_path: storagePath,
    sort_order: sortOrder,
    unlock_cost: unlockCost,
    design_key: designKey,
  };

  const insRes = await adminFetch(`basecamp_objects?select=id,name`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!insRes.ok) {
    await removeImage(storagePath);
    const text = await insRes.text().catch(() => "");
    return NextResponse.json(
      { error: `등록 실패 (${insRes.status}): ${text}` },
      { status: 500 }
    );
  }
  const arr = (await insRes.json()) as { id: string; name: string }[];
  return NextResponse.json({ success: true, object: arr[0] });
}
