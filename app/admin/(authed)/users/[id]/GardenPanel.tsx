import { Sprout } from "lucide-react";
import { adminList } from "@/lib/admin-rest";

type Species = {
  id: string;
  key: string;
  name: string;
  category: string;
  zone: "ground" | "bank" | "sky";
  max_stage: number;
  is_brand: boolean;
  svg_key: string;
};

type Plant = {
  id: string;
  species_id: string;
  stage: number;
  is_mature: boolean;
  placed: boolean;
  xf: number;
  yf: number;
  zone: string;
  source_puzzle_id: string | null;
  planted_at: string;
};

// 카테고리 → 이모지 (BO 배치도용 마커; 실제 앱 SVG 는 react-native-svg 라 재사용 불가)
const CATEGORY_EMOJI: Record<string, string> = {
  flower: "🌸",
  tree: "🌳",
  bush: "🌿",
  mushroom: "🍄",
  animal: "🐾",
  product: "🚩",
};

// 특정 브랜드 종은 좀 더 구체적 이모지
const SPECIES_EMOJI: Record<string, string> = {
  daisy: "🌼",
  tulip: "🌷",
  sunflower: "🌻",
  bush: "🌿",
  mushroom: "🍄",
  round_tree: "🌳",
  big_pine: "🌲",
  hallasan_tree: "🎋",
  rabbit: "🐇",
  duck: "🦆",
  deer: "🦌",
  white_deer: "🦌",
  tent: "⛺",
  flag: "🚩",
  sign: "🪧",
};

function speciesEmoji(sp: Species): string {
  return SPECIES_EMOJI[sp.key] ?? CATEGORY_EMOJI[sp.category] ?? "🌱";
}

const ZONE_LABEL: Record<string, string> = {
  ground: "땅",
  bank: "둔덕",
  sky: "하늘",
};

export default async function GardenPanel({ userId }: { userId: string }) {
  const [plantsRes, balanceRes, speciesRes] = await Promise.all([
    adminList<Plant>(
      `garden_plants?select=id,species_id,stage,is_mature,placed,xf,yf,zone,source_puzzle_id,planted_at&user_id=eq.${userId}&order=planted_at.desc`,
      { from: 0, to: 999 }
    ),
    adminList<{ balance: number }>(
      `garden_seed_balance?select=balance&user_id=eq.${userId}&limit=1`
    ),
    adminList<Species>(
      `garden_species?select=id,key,name,category,zone,max_stage,is_brand,svg_key`,
      { from: 0, to: 999 }
    ),
  ]);

  const plants = plantsRes.rows;
  const seedBalance = balanceRes.rows[0]?.balance ?? 0;
  const speciesMap = new Map(speciesRes.rows.map((s) => [s.id, s]));

  const placedCount = plants.filter((p) => p.placed).length;
  const ownedCount = plants.length - placedCount;
  const matureCount = plants.filter((p) => p.is_mature).length;

  // 종별 집계
  type SpeciesRow = {
    species: Species;
    total: number;
    placed: number;
    mature: number;
  };
  const bySpecies = new Map<string, SpeciesRow>();
  for (const p of plants) {
    const sp = speciesMap.get(p.species_id);
    if (!sp) continue;
    const row = bySpecies.get(sp.id) ?? {
      species: sp,
      total: 0,
      placed: 0,
      mature: 0,
    };
    row.total += 1;
    if (p.placed) row.placed += 1;
    if (p.is_mature) row.mature += 1;
    bySpecies.set(sp.id, row);
  }
  const speciesRows = Array.from(bySpecies.values()).sort(
    (a, b) => b.total - a.total
  );

  const placedPlants = plants.filter((p) => p.placed);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold text-white">정원</h2>
          <span className="text-[11px] text-gray-500">
            · 배치 {placedCount} / 미배치 {ownedCount}
          </span>
        </div>
        <div className="text-[11px] text-gray-400">
          정원 씨앗 잔액{" "}
          <span className="text-emerald-300 font-mono">
            {seedBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {plants.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-500">
          아직 심은 식물이 없어요.
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* 배치도 미니 SVG */}
          <div>
            <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider">
              배치도 (placed = {placedCount})
            </div>
            <GardenMap
              plants={placedPlants}
              speciesMap={speciesMap}
            />
          </div>

          {/* 종별 요약 */}
          <div>
            <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider">
              종별 보유 · 성숙 {matureCount} / 전체 {plants.length}
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-white/[0.03] text-gray-400 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">종</th>
                    <th className="text-left px-3 py-2 font-medium">종류</th>
                    <th className="text-left px-3 py-2 font-medium">영역</th>
                    <th className="text-center px-3 py-2 font-medium">브랜드</th>
                    <th className="text-right px-3 py-2 font-medium">배치</th>
                    <th className="text-right px-3 py-2 font-medium">성숙</th>
                    <th className="text-right px-3 py-2 font-medium">보유</th>
                  </tr>
                </thead>
                <tbody>
                  {speciesRows.map((r) => (
                    <tr
                      key={r.species.id}
                      className="border-t border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-2 text-xs text-white">
                        <span className="mr-1.5">{speciesEmoji(r.species)}</span>
                        {r.species.name}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {r.species.category}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {ZONE_LABEL[r.species.zone] ?? r.species.zone}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.species.is_brand ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] font-medium">
                            브랜드
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-emerald-200">
                        {r.placed}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-yellow-200">
                        {r.mature}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm text-white">
                        {r.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ────── 배치도 미니 SVG ──────
 * (xf, yf) 는 0..1 정규화 좌표. 상단 = 하늘/둔덕, 하단 = 땅.
 * 아이콘 위치만 표시 (앱과 정확히 같은 SVG 는 재현하지 않음).
 */
function GardenMap({
  plants,
  speciesMap,
}: {
  plants: Plant[];
  speciesMap: Map<string, Species>;
}) {
  const W = 640;
  const H = 320;
  return (
    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto block"
      >
        <defs>
          <linearGradient id="gp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7FC8EE" />
            <stop offset="1" stopColor="#E6F4F8" />
          </linearGradient>
          <linearGradient id="gp-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#71C089" />
            <stop offset="1" stopColor="#4E9E4E" />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={W} height={H * 0.55} fill="url(#gp-sky)" />
        <rect
          x={0}
          y={H * 0.55}
          width={W}
          height={H * 0.45}
          fill="url(#gp-ground)"
        />
        {/* 경계선 */}
        <line
          x1={0}
          x2={W}
          y1={H * 0.55}
          y2={H * 0.55}
          stroke="#ffffff"
          strokeOpacity={0.2}
          strokeDasharray="4 4"
        />
        <line
          x1={0}
          x2={W}
          y1={H * 0.82}
          y2={H * 0.82}
          stroke="#ffffff"
          strokeOpacity={0.15}
          strokeDasharray="4 4"
        />

        {/* 식물 마커 (텍스트 이모지) */}
        {plants.map((p) => {
          const sp = speciesMap.get(p.species_id);
          if (!sp) return null;
          const cx = Math.max(6, Math.min(W - 6, p.xf * W));
          const cy = Math.max(12, Math.min(H - 6, p.yf * H));
          return (
            <text
              key={p.id}
              x={cx}
              y={cy}
              fontSize={18}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ userSelect: "none" }}
            >
              <title>
                {sp.name} · 단계 {p.stage}/{sp.max_stage}
                {p.is_mature ? " · 성숙" : ""}
              </title>
              {speciesEmoji(sp)}
            </text>
          );
        })}
      </svg>
      <div className="absolute bottom-1.5 right-2 text-[10px] text-white/50 font-mono">
        {plants.length}개 배치
      </div>
    </div>
  );
}
