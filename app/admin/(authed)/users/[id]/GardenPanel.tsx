import { Sprout } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import {
  bandPath,
  Cloud,
  dim,
  hillPath,
  MiniTree,
  PLANT_SVG,
  plantScale,
  ridgePath,
} from "./garden-svgs";

type Species = {
  id: string;
  key: string;
  name: string;
  category: string;
  zone: "ground" | "bank" | "sky";
  max_stage: number;
  is_brand: boolean;
  svg_key: string;
  scale_m: number | string;
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
      `garden_species?select=id,key,name,category,zone,max_stage,is_brand,svg_key,scale_m`,
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
          {/* 배치도 — 앱과 동일 풍경 + 실제 식물 SVG */}
          <div>
            <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider">
              배치도 (placed = {placedCount})
            </div>
            <GardenScene plants={placedPlants} speciesMap={speciesMap} />
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
                        <SpeciesThumb species={r.species} />
                        <span className="ml-1.5">{r.species.name}</span>
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

/* ────── 정원 씬 — hilly_rn/components/garden/GardenCanvas.tsx GardenScene 이식 ──────
 * (xf, yf) 는 0..1 정규화 좌표.
 * 하늘/능선/언덕/모래톱/강 + 배치된 식물의 실제 svg_key 렌더 (원근 스케일).
 * wilt 는 고정 0 (관리자 뷰는 시들기 상태 무관).
 */
function GardenScene({
  plants,
  speciesMap,
}: {
  plants: Plant[];
  speciesMap: Map<string, Species>;
}) {
  const W = 960;
  const H = 640;
  const wilt = 0;

  const skyTop = dim("#7FC8EE", wilt);
  const skyBot = dim("#E6F4F8", wilt);
  const mtn = dim("#8FC9B0", wilt);
  const mtn2 = dim("#7BBBA0", wilt);
  const hill = dim("#71C089", wilt);
  const fore1 = dim("#67BE69", wilt);
  const fore2 = dim("#4E9E4E", wilt);
  const treeBack = dim("#4F9E86", wilt);
  const treeFore = dim("#3C8E5E", wilt);

  const sBase = W / 360;

  // 뒤→앞 정렬 (yf 오름)
  const order = plants
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.yf - b.p.yf);

  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-black/40">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto block"
      >
        <defs>
          <linearGradient id="gp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyBot} />
          </linearGradient>
          <radialGradient id="gp-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={dim("#FFC684", wilt)} />
            <stop offset="1" stopColor={dim("#FF8E5E", wilt)} />
          </radialGradient>
          <linearGradient id="gp-fore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={fore1} />
            <stop offset="1" stopColor={fore2} />
          </linearGradient>
          <linearGradient id="gp-river" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={dim("#9FD6EA", wilt)} />
            <stop offset="1" stopColor={dim("#5EAACB", wilt)} />
          </linearGradient>
        </defs>

        {/* 하늘 */}
        <rect x={0} y={0} width={W} height={H} fill="url(#gp-sky)" />
        {wilt === 0 && (
          <circle cx={W * 0.6} cy={H * 0.3} r={W * 0.045} fill="url(#gp-sun)" />
        )}
        <Cloud x={W * 0.32} y={H * 0.25} s={1.1} />
        <Cloud x={W * 0.74} y={H * 0.29} s={0.9} />

        {/* 능선·언덕 */}
        <path d={ridgePath(W, H, H * 0.46, H * 0.34, 7)} fill={mtn} />
        <path d={hillPath(W, H, H * 0.5, H * 0.015, 8)} fill={mtn2} />
        {Array.from({ length: 16 }).map((_, i) => (
          <MiniTree
            key={`bt-${i}`}
            x={W * (0.04 + i * 0.06)}
            y={H * (0.49 + (i % 2) * 0.006)}
            h={H * 0.013}
            c={treeBack}
          />
        ))}
        <path d={hillPath(W, H, H * 0.53, H * 0.013, 7)} fill={hill} />

        <path d={hillPath(W, H, H * 0.56, H * 0.016, 7)} fill="url(#gp-fore)" />
        {Array.from({ length: 8 }).map((_, i) => (
          <MiniTree
            key={`ft-${i}`}
            x={W * (0.05 + i * 0.13)}
            y={H * (0.585 + (i % 2) * 0.006)}
            h={H * 0.017}
            c={treeFore}
          />
        ))}

        {/* 모래톱 + 앞쪽 강 */}
        <path
          d={bandPath(W, H * 0.82, H * 0.845, H * 0.005, 6)}
          fill={dim("#E6D6AC", wilt)}
        />
        <path d={hillPath(W, H, H * 0.845, H * 0.006, 6)} fill="url(#gp-river)" />
        {[0.875, 0.91, 0.945].map((fy, i) => (
          <path
            key={i}
            d={`M${(W * 0.05).toFixed(1)} ${(H * fy).toFixed(1)} Q ${(W * 0.3).toFixed(1)} ${(H * (fy - 0.004)).toFixed(1)} ${(W * 0.58).toFixed(1)} ${(H * fy).toFixed(1)} T ${(W * 0.95).toFixed(1)} ${(H * fy).toFixed(1)}`}
            stroke="#ffffff"
            strokeOpacity={0.3}
            strokeWidth={W * 0.003}
            fill="none"
          />
        ))}

        {/* 식물 (뒤→앞) */}
        {order.map(({ p, i }) => {
          const sp = speciesMap.get(p.species_id);
          if (!sp) return null;
          const render = PLANT_SVG[sp.svg_key] ?? PLANT_SVG.Sprout;
          const m = Number(sp.scale_m) || 1;
          const g = sp.max_stage > 0 ? p.stage / sp.max_stage : 1;
          const cx = p.xf * W;
          if (p.zone === "sky") {
            const s = sBase * m;
            const cy = p.yf * H;
            return (
              <g
                key={i}
                transform={`translate(${(cx - 50 * s).toFixed(2)} ${(cy - 50 * s).toFixed(2)}) scale(${s.toFixed(3)})`}
              >
                <title>
                  {sp.name} · 단계 {p.stage}/{sp.max_stage}
                  {p.is_mature ? " · 성숙" : ""}
                </title>
                {render(wilt, Math.max(0.05, Math.min(1, g)))}
              </g>
            );
          }
          const baseY = p.yf * H;
          const s = plantScale(p.yf, m, sBase);
          return (
            <g key={i}>
              <title>
                {sp.name} · 단계 {p.stage}/{sp.max_stage}
                {p.is_mature ? " · 성숙" : ""}
              </title>
              <ellipse
                cx={cx}
                cy={baseY + 3}
                rx={20 * s}
                ry={4 * s}
                fill="#000"
                opacity={0.1}
              />
              <g
                transform={`translate(${(cx - 50 * s).toFixed(2)} ${(baseY - 86 * s).toFixed(2)}) scale(${s.toFixed(3)})`}
              >
                {render(wilt, Math.max(0.05, Math.min(1, g)))}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** 종 카탈로그 썸네일 (표 내부용, 40x40) — 씬과 동일한 SVG 재사용 */
function SpeciesThumb({ species }: { species: Species }) {
  const render = PLANT_SVG[species.svg_key] ?? PLANT_SVG.Sprout;
  return (
    <span className="inline-block align-middle">
      <svg
        width={28}
        height={28}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMax meet"
      >
        {render(0, 1)}
      </svg>
    </span>
  );
}
