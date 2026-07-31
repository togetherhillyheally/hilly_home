import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 보물 비율 — 조각의 약 1/4 (나머지는 걸어서 번 씨앗으로 뽑음) */
const TREASURE_RATIO = 0.25;

type LngLat = [number, number];

function haversineM(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** trail.coordinates(jsonb) → 평탄화된 [lng,lat][] */
function flattenCoords(raw: unknown): LngLat[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  // 멀티루트: [[[lng,lat],...],[...]] — 첫 요소가 좌표배열의 배열인지로 판별
  const first = raw[0];
  const isMulti =
    Array.isArray(first) &&
    first.length > 0 &&
    Array.isArray(first[0]);
  const routes: unknown[] = isMulti ? (raw as unknown[]) : [raw];
  const out: LngLat[] = [];
  for (const route of routes) {
    if (!Array.isArray(route)) continue;
    for (const pt of route) {
      if (
        Array.isArray(pt) &&
        typeof pt[0] === "number" &&
        typeof pt[1] === "number"
      ) {
        out.push([pt[0], pt[1]]);
      }
    }
  }
  return out;
}

/** 폴리라인 위 누적거리 d 지점의 좌표 (선형보간) */
function pointAtDistance(
  coords: LngLat[],
  prefix: number[],
  d: number
): LngLat {
  if (d <= 0) return coords[0];
  const total = prefix[prefix.length - 1];
  if (d >= total) return coords[coords.length - 1];
  // prefix 이진탐색
  let lo = 0;
  let hi = prefix.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (prefix[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  const j = Math.max(1, lo);
  const segLen = prefix[j] - prefix[j - 1] || 1;
  const t = (d - prefix[j - 1]) / segLen;
  const a = coords[j - 1];
  const b = coords[j];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type PuzzleRow = {
  id: string;
  grid_rows: number;
  grid_cols: number;
  total_pieces: number;
  trail_id: string | null;
  series_name: string | null;
};

async function loadPuzzle(id: string): Promise<PuzzleRow | null> {
  const res = await adminFetch(
    `puzzles?id=eq.${id}&select=id,grid_rows,grid_cols,total_pieces,trail_id,series_name`
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as PuzzleRow[];
  return rows[0] ?? null;
}

const TREASURE_STARTER = 3; // 무료 스타터 조각 수 (draw_starter_pieces)

/** 완주 경제성 계산 — 1회 완주 씨앗 vs 퍼즐 필요 씨앗 + 권장 배율 */
function computeEconomics(
  total: number,
  distanceKm: number,
  seedMultiplier: number
) {
  const treasureCount = Math.max(
    1,
    Math.min(total - 1, Math.ceil(total * TREASURE_RATIO))
  );
  const needed = Math.max(0, total - treasureCount - TREASURE_STARTER);
  const distPieces = Math.floor(distanceKm / 1.5);
  // 시간 보너스 — 통상 도보 ~15분/km 가정
  const timePiecesTypical = Math.min(distPieces, Math.floor(distanceKm / 3));
  const baseTypical = Math.max(1, distPieces + timePiecesTypical);
  const currentPerWalk = Math.max(
    1,
    Math.floor(baseTypical * (seedMultiplier || 1))
  );
  // 권장 배율 — 시간 보너스 없이(빠른 완주) 거리조각만으로도 필요치를 덮도록
  const baseConservative = Math.max(1, distPieces);
  const recommendedMultiplier =
    needed <= 0 ? 1 : Math.max(1, Math.ceil(needed / baseConservative));
  return {
    totalPieces: total,
    treasureCount,
    starter: TREASURE_STARTER,
    needed,
    distanceKm,
    currentMultiplier: seedMultiplier || 1,
    currentPerWalk,
    recommendedMultiplier,
  };
}

/** GET — 현재 보물 개수/목록 + 완주 경제성 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;

  const res = await adminFetch(
    `puzzle_treasures?puzzle_id=eq.${id}&select=id,cell_index,lng,lat,seq&order=seq.asc`
  );
  const treasures = res.ok ? ((await res.json()) as unknown[]) : [];

  const puzzle = await loadPuzzle(id);
  let economics: ReturnType<typeof computeEconomics> | null = null;
  let coordinates: unknown = null;
  if (puzzle?.trail_id) {
    const total =
      puzzle.total_pieces || puzzle.grid_rows * puzzle.grid_cols;
    const tRes = await adminFetch(
      `trails?id=eq.${puzzle.trail_id}&select=distance_km,seed_multiplier,coordinates`
    );
    if (tRes.ok) {
      const trow = (
        (await tRes.json()) as Array<{
          distance_km: number | null;
          seed_multiplier: number | null;
          coordinates: unknown;
        }>
      )[0];
      economics = computeEconomics(
        total,
        Number(trow?.distance_km ?? 0),
        Number(trow?.seed_multiplier ?? 1)
      );
      coordinates = trow?.coordinates ?? null;
    }
  }

  return NextResponse.json({
    treasures,
    count: treasures.length,
    economics,
    coordinates,
  });
}

/** PUT — 연결된 코스의 씨앗 배율(seed_multiplier) 설정 */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;

  let body: { multiplier?: number };
  try {
    body = (await req.json()) as { multiplier?: number };
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const m = Number(body.multiplier);
  if (!Number.isFinite(m) || m < 0.1 || m > 20) {
    return NextResponse.json(
      { error: "배율은 0.1 ~ 20 사이여야 해요." },
      { status: 400 }
    );
  }

  const puzzle = await loadPuzzle(id);
  if (!puzzle?.trail_id) {
    return NextResponse.json(
      { error: "먼저 코스 지도를 연결해 주세요." },
      { status: 400 }
    );
  }

  const res = await adminFetch(`trails?id=eq.${puzzle.trail_id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ seed_multiplier: m }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `배율 저장 실패: ${t || res.status}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true, multiplier: m });
}

/** POST — 경로를 따라 보물 자동 배치 (기존 것 삭제 후 재생성) */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;

  const puzzle = await loadPuzzle(id);
  if (!puzzle)
    return NextResponse.json({ error: "퍼즐을 찾을 수 없어요." }, { status: 404 });

  if (!puzzle.trail_id) {
    return NextResponse.json(
      {
        error: puzzle.series_name
          ? "시리즈 연결 퍼즐은 자동 배치를 지원하지 않아요. 구간(트레일)별 퍼즐로 연결해 주세요."
          : "먼저 이 퍼즐에 코스 지도를 연결하고 저장해 주세요.",
      },
      { status: 400 }
    );
  }

  const total = puzzle.total_pieces || puzzle.grid_rows * puzzle.grid_cols;
  if (total < 4) {
    return NextResponse.json(
      { error: "조각이 너무 적어요 (최소 4)." },
      { status: 400 }
    );
  }

  // 트레일 좌표 로드
  const trailRes = await adminFetch(
    `trails?id=eq.${puzzle.trail_id}&select=coordinates`
  );
  if (!trailRes.ok)
    return NextResponse.json({ error: "트레일 조회 실패" }, { status: 500 });
  const trailRows = (await trailRes.json()) as Array<{ coordinates: unknown }>;
  const coords = flattenCoords(trailRows[0]?.coordinates);
  if (coords.length < 2) {
    return NextResponse.json(
      { error: "이 코스에 경로 좌표가 없어요. 자동 배치할 수 없어요." },
      { status: 400 }
    );
  }

  // 누적거리
  const prefix: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    prefix.push(prefix[i - 1] + haversineM(coords[i - 1], coords[i]));
  }
  const totalLen = prefix[prefix.length - 1];
  if (totalLen <= 0) {
    return NextResponse.json(
      { error: "경로 길이가 0이에요." },
      { status: 400 }
    );
  }

  // 보물 개수 = ceil(1/4), 최소 1, 최대 total-1
  const count = Math.max(1, Math.min(total - 1, Math.ceil(total * TREASURE_RATIO)));

  // 구간별 jitter 위치 — 등간격 X, 시작/끝 X (보물다운 불규칙 배치)
  const fractions: number[] = [];
  for (let i = 0; i < count; i++) {
    const segStart = i / count;
    const segEnd = (i + 1) / count;
    // 구간 내부 20~80% 사이 랜덤 → 경계/등간격 회피
    const inner = 0.2 + Math.random() * 0.6;
    let f = segStart + inner * (segEnd - segStart);
    // 전체 시작/끝 3% 여백
    f = Math.min(0.97, Math.max(0.03, f));
    fractions.push(f);
  }
  fractions.sort((a, b) => a - b);

  // 보물 셀 = 전체 셀에서 무작위 count 개
  const cells = shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, count);

  const rows = fractions.map((f, i) => {
    const p = pointAtDistance(coords, prefix, f * totalLen);
    return {
      puzzle_id: id,
      trail_id: puzzle.trail_id,
      cell_index: cells[i],
      lng: p[0],
      lat: p[1],
      seq: i,
    };
  });

  // 기존 삭제 후 삽입
  const del = await adminFetch(`puzzle_treasures?puzzle_id=eq.${id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!del.ok) {
    const t = await del.text().catch(() => "");
    return NextResponse.json(
      { error: `기존 보물 삭제 실패: ${t || del.status}` },
      { status: 500 }
    );
  }

  const ins = await adminFetch(`puzzle_treasures`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!ins.ok) {
    const t = await ins.text().catch(() => "");
    return NextResponse.json(
      { error: `보물 저장 실패: ${t || ins.status}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    count,
    totalPieces: total,
    seedCells: total - count,
    trailLengthKm: Math.round((totalLen / 1000) * 10) / 10,
  });
}

/** DELETE — 보물 전체 제거 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession();
  if (!session)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  const del = await adminFetch(`puzzle_treasures?puzzle_id=eq.${id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!del.ok) {
    const t = await del.text().catch(() => "");
    return NextResponse.json(
      { error: `삭제 실패: ${t || del.status}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
