import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_PUZZLE_TYPES = new Set(["mystery", "hint", "brand"]);

type Body = {
  name?: string;
  description?: string | null;
  reward_description?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  grid_rows?: number;
  grid_cols?: number;
  /** 난이도 1~5 — 운영자 수동값 (격자에서 유도하지 않음, 2026-08-12) */
  base_tier?: number;
  /** 이벤트 기간 (ISO) — null = 상시 */
  event_starts_at?: string | null;
  event_ends_at?: string | null;
  trail_id?: string | null;
  series_name?: string | null;
  collab_title?: string | null;
  collab_description?: string | null;
  puzzle_type?: string;
  is_active?: boolean;
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "puzzles")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "퍼즐 이름은 비울 수 없어요." },
        { status: 400 }
      );
    }
    update.name = trimmed;
  }
  if (body.description !== undefined) {
    update.description =
      body.description === null ? null : String(body.description).trim() || null;
  }
  if (body.reward_description !== undefined) {
    update.reward_description =
      body.reward_description === null
        ? null
        : String(body.reward_description).trim() || null;
  }

  // 이미지 URL — image_url·cover_image_url 은 항상 같은 값으로 유지 (RN 과 동일)
  const imgSet =
    body.image_url !== undefined || body.cover_image_url !== undefined;
  if (imgSet) {
    const v =
      body.image_url !== undefined ? body.image_url : body.cover_image_url;
    const norm = v === null ? null : String(v).trim() || null;
    update.image_url = norm;
    update.cover_image_url = norm;
  }

  // 격자 — rows, cols 둘 다 넘어와야 반영, total_pieces 동기.
  // base_tier 는 더 이상 격자에서 유도하지 않는다 (수동 난이도, 2026-08-12)
  if (body.grid_rows !== undefined || body.grid_cols !== undefined) {
    const r = Number(body.grid_rows);
    const c = Number(body.grid_cols);
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 3 || c < 3) {
      return NextResponse.json(
        { error: "grid_rows, grid_cols 는 3 이상의 정수여야 해요." },
        { status: 400 }
      );
    }
    if (r > 20 || c > 20) {
      return NextResponse.json(
        { error: "격자가 너무 커요. (최대 20)" },
        { status: 400 }
      );
    }
    update.grid_rows = r;
    update.grid_cols = c;
    update.total_pieces = r * c;
  }

  // 난이도 — 운영자가 이미지를 보고 직접 지정 (완성 물병 수 결정)
  if (body.base_tier !== undefined) {
    const t = Number(body.base_tier);
    if (!Number.isInteger(t) || t < 1 || t > 5) {
      return NextResponse.json(
        { error: "base_tier 는 1~5 정수여야 해요." },
        { status: 400 }
      );
    }
    update.base_tier = t;
  }

  // 이벤트 기간 — 인증(콜라보) 씨앗 부스트 유효 구간. null = 상시
  if (body.event_starts_at !== undefined) {
    update.event_starts_at =
      body.event_starts_at === null ? null : String(body.event_starts_at);
  }
  if (body.event_ends_at !== undefined) {
    update.event_ends_at =
      body.event_ends_at === null ? null : String(body.event_ends_at);
  }

  // 트레일·시리즈 상호배타
  const trailSet = body.trail_id !== undefined;
  const seriesSet = body.series_name !== undefined;
  if (trailSet || seriesSet) {
    let trailId: string | null =
      body.trail_id === null ? null : body.trail_id ?? null;
    let seriesName: string | null =
      body.series_name === null ? null : body.series_name ?? null;
    if (trailId && !UUID_RE.test(trailId)) {
      return NextResponse.json({ error: "잘못된 trail_id" }, { status: 400 });
    }
    if (trailId && seriesName) {
      // 상호배타: 클라이언트가 실수로 둘 다 보냈으면 명시적 지정한 쪽만 남기고 다른 쪽 클리어
      // 트레일 우선으로 처리
      seriesName = null;
    }
    if (typeof seriesName === "string") {
      seriesName = seriesName.trim() || null;
    }
    if (trailSet) update.trail_id = trailId;
    if (seriesSet) update.series_name = seriesName;
    // 반대편도 명시적으로 클리어
    if (trailId && !seriesSet) update.series_name = null;
    if (seriesName && !trailSet) update.trail_id = null;
  }

  if (body.collab_title !== undefined) {
    update.collab_title =
      body.collab_title === null
        ? null
        : String(body.collab_title).trim() || null;
  }
  if (body.collab_description !== undefined) {
    update.collab_description =
      body.collab_description === null
        ? null
        : String(body.collab_description).trim() || null;
  }

  if (body.puzzle_type !== undefined) {
    if (!VALID_PUZZLE_TYPES.has(String(body.puzzle_type))) {
      return NextResponse.json(
        { error: "puzzle_type 은 mystery/hint/brand 중 하나여야 해요." },
        { status: 400 }
      );
    }
    update.puzzle_type = body.puzzle_type;
  }

  if (typeof body.is_active === "boolean") {
    update.is_active = body.is_active;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "변경할 필드가 없어요." },
      { status: 400 }
    );
  }

  const res = await adminFetch(`puzzles?id=eq.${id}`, {
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
      { error: `업데이트 실패: ${text || res.status}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
