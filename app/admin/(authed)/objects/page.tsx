import Link from "next/link";
import { adminList } from "@/lib/admin-rest";
import { PLANT_SVG } from "../users/[id]/garden-svgs";

export const dynamic = "force-dynamic";

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
  grant_puzzle_id: string | null;
  stage_names: string[] | null;
  sort_order: number;
};

type PlantRow = { species_id: string; is_mature: boolean };
type PuzzleMini = { id: string; name: string };

const CATEGORY_LABELS: Record<string, string> = {
  flower: "꽃",
  bush: "덤불",
  mushroom: "버섯",
  tree: "나무",
  animal: "동물",
  product: "제품",
  sky: "하늘",
};

const ZONE_LABELS: Record<string, string> = {
  ground: "땅",
  bank: "둔덕",
  sky: "하늘",
};

function buildHref(s: { cat?: string; brand?: string }) {
  const sp = new URLSearchParams();
  if (s.cat && s.cat !== "all") sp.set("cat", s.cat);
  if (s.brand && s.brand !== "all") sp.set("brand", s.brand);
  const qs = sp.toString();
  return qs ? `/admin/objects?${qs}` : "/admin/objects";
}

export default async function ObjectsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; brand?: string }>;
}) {
  const sp = await searchParams;
  const cat = (sp.cat ?? "all").trim();
  const brand = (sp.brand ?? "all").trim();

  const { rows: allSpecies } = await adminList<Species>(
    "garden_species?select=id,key,name,category,zone,max_stage,is_brand,svg_key,scale_m,grant_puzzle_id,stage_names,sort_order&order=sort_order.asc.nullslast,key.asc",
    { from: 0, to: 999 }
  );

  const species = allSpecies.filter((s) => {
    if (cat !== "all" && s.category !== cat) return false;
    if (brand === "brand" && !s.is_brand) return false;
    if (brand === "regular" && s.is_brand) return false;
    return true;
  });

  const categories = Array.from(new Set(allSpecies.map((s) => s.category))).sort();

  const { rows: allPlants } = await adminList<PlantRow>(
    "garden_plants?select=species_id,is_mature",
    { from: 0, to: 9999 }
  );
  const totalMap = new Map<string, number>();
  const matureMap = new Map<string, number>();
  for (const p of allPlants) {
    totalMap.set(p.species_id, (totalMap.get(p.species_id) ?? 0) + 1);
    if (p.is_mature)
      matureMap.set(p.species_id, (matureMap.get(p.species_id) ?? 0) + 1);
  }

  const puzzleIds = Array.from(
    new Set(species.map((s) => s.grant_puzzle_id).filter(Boolean) as string[])
  );
  const puzzleMap = new Map<string, string>();
  if (puzzleIds.length > 0) {
    const { rows: puzzles } = await adminList<PuzzleMini>(
      `puzzles?select=id,name&id=in.(${puzzleIds.join(",")})`
    );
    puzzles.forEach((p) => puzzleMap.set(p.id, p.name));
  }

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          정원 도감
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          유저가 정원에서 심고 꾸밀 수 있는 식물·동물·제품 · 총{" "}
          {species.length.toLocaleString()}종
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip
          href={buildHref({ cat: "all", brand })}
          active={cat === "all"}
          label="전체"
        />
        {categories.map((c) => (
          <FilterChip
            key={c}
            href={buildHref({ cat: c, brand })}
            active={cat === c}
            label={CATEGORY_LABELS[c] ?? c}
          />
        ))}
        <div className="w-px h-6 bg-white/10 mx-1 self-center" />
        <FilterChip
          href={buildHref({ cat, brand: "all" })}
          active={brand === "all"}
          label="일반+브랜드"
        />
        <FilterChip
          href={buildHref({ cat, brand: "regular" })}
          active={brand === "regular"}
          label="일반"
        />
        <FilterChip
          href={buildHref({ cat, brand: "brand" })}
          active={brand === "brand"}
          label="브랜드"
        />
      </div>

      {species.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          조건에 맞는 종이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {species.map((s) => {
            const total = totalMap.get(s.id) ?? 0;
            const mature = matureMap.get(s.id) ?? 0;
            const grantName = s.grant_puzzle_id
              ? puzzleMap.get(s.grant_puzzle_id) ?? null
              : null;
            return (
              <SpeciesCard
                key={s.id}
                species={s}
                total={total}
                mature={mature}
                grantPuzzleName={grantName}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`px-3 h-8 inline-flex items-center rounded-lg text-xs font-medium transition-colors ${
        active
          ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
          : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function SpeciesCard({
  species,
  total,
  mature,
  grantPuzzleName,
}: {
  species: Species;
  total: number;
  mature: number;
  grantPuzzleName: string | null;
}) {
  const render = PLANT_SVG[species.svg_key] ?? PLANT_SVG.Sprout;
  const stageNames = Array.isArray(species.stage_names) ? species.stage_names : [];
  const finalStage = stageNames[stageNames.length - 1];
  const stageCount = Math.max(1, species.max_stage) + 1;
  const stages = Array.from({ length: stageCount }, (_, i) => ({
    idx: i,
    // stage 0 = 씨앗(seedling), 이후는 species svg 를 성장도(i/max_stage) 로 렌더
    growth: species.max_stage > 0 ? i / species.max_stage : 1,
    name: stageNames[i],
    isSeedling: i === 0,
  }));

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-emerald-500/30 transition-colors">
      <div className="aspect-square bg-gradient-to-b from-sky-900/20 to-emerald-900/10 flex items-end justify-center">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMax meet"
          className="w-full h-full"
        >
          {render(0, 1)}
        </svg>
      </div>

      <div className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {species.name}
            </div>
            <div className="text-[10px] text-gray-500 font-mono truncate">
              {species.key}
            </div>
          </div>
          {species.is_brand ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] font-medium flex-shrink-0">
              브랜드
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] text-gray-300">
            {CATEGORY_LABELS[species.category] ?? species.category}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] text-gray-300">
            {ZONE_LABELS[species.zone] ?? species.zone}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] text-gray-400">
            {species.max_stage}단계
          </span>
        </div>

        {/* 성장 스트립 */}
        <div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">
            성장 단계
          </div>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${stageCount}, minmax(0, 1fr))` }}
          >
            {stages.map((st) => (
              <div
                key={st.idx}
                className="aspect-square rounded bg-gradient-to-b from-sky-900/15 to-emerald-900/10 border border-white/5 flex items-end justify-center"
                title={st.name ?? `stage ${st.idx}`}
              >
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMax meet"
                  className="w-full h-full"
                >
                  {st.isSeedling
                    ? PLANT_SVG.Seed(0)
                    : render(0, Math.max(0.05, Math.min(1, st.growth)))}
                </svg>
              </div>
            ))}
          </div>
        </div>

        {grantPuzzleName ? (
          <div className="text-[10px] text-violet-300 truncate">
            🧩 {grantPuzzleName}
          </div>
        ) : null}

        {finalStage ? (
          <div className="text-[10px] text-gray-500 truncate">
            성숙: {finalStage}
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-2">
          <span className="text-[10px] text-gray-500">유저 심음</span>
          <span className="text-xs font-mono text-emerald-200">
            {total.toLocaleString()}
            {mature > 0 ? (
              <span className="text-yellow-200 ml-1">/{mature}성숙</span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}
