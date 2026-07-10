import Link from "next/link";
import { adminList } from "@/lib/admin-rest";
import { PLANT_SVG } from "../users/[id]/garden-svgs";
import StageStrip from "./StageStrip";
import PublishToggle from "./PublishToggle";
import PlantCostEditor from "./PlantCostEditor";

export const dynamic = "force-dynamic";

type Species = {
  id: string;
  key: string;
  name: string;
  category: string;
  zone: "ground" | "bank" | "sky";
  max_stage: number;
  is_brand: boolean;
  is_published: boolean;
  svg_key: string;
  scale_m: number | string;
  grant_puzzle_id: string | null;
  stage_names: string[] | null;
  sort_order: number;
  tint: string | null;
  is_variant: boolean;
  plant_cost: number;
  plant_cost_manual: boolean;
};

type PlantRow = { species_id: string; is_mature: boolean };

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
    "garden_species?select=id,key,name,category,zone,max_stage,is_brand,is_published,svg_key,scale_m,grant_puzzle_id,stage_names,sort_order,tint,is_variant,plant_cost,plant_cost_manual&order=sort_order.asc.nullslast,key.asc",
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

  // 종 → 연결 퍼즐명 (garden_puzzle_rewards junction 기준 — 1:1)
  const rewardPuzzleMap = new Map<string, string>();
  {
    const { rows: links } = await adminList<{
      species_id: string;
      puzzles: { name: string } | null;
    }>(`garden_puzzle_rewards?select=species_id,puzzles(name)`, {
      from: 0,
      to: 999,
    });
    links.forEach((l) => {
      if (l.puzzles?.name) rewardPuzzleMap.set(l.species_id, l.puzzles.name);
    });
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
          label="일반+한정"
        />
        <FilterChip
          href={buildHref({ cat, brand: "regular" })}
          active={brand === "regular"}
          label="일반"
        />
        <FilterChip
          href={buildHref({ cat, brand: "brand" })}
          active={brand === "brand"}
          label="✨ 한정"
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
            const grantName = rewardPuzzleMap.get(s.id) ?? null;
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
  // 히든(이스터에그) 종·단일 형태 종은 성장 단계 미표시 (유니콘·무지개 데이지 등)
  const showStages =
    !species.key.startsWith("hidden_") && stageNames.length > 1;

  return (
    <div
      className={`rounded-xl border bg-white/[0.02] overflow-hidden transition-colors ${
        species.is_published
          ? "border-white/10 hover:border-emerald-500/30"
          : "border-amber-500/30 hover:border-amber-500/50"
      }`}
    >
      <div className="aspect-square bg-gradient-to-b from-sky-900/20 to-emerald-900/10 flex items-end justify-center relative">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMax meet"
          className="w-full h-full"
        >
          {render(0, 1, false, species.tint)}
        </svg>
        {!species.is_published ? (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-black text-[10px] font-semibold">
            미공개
          </div>
        ) : null}
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
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-medium flex-shrink-0"
              title="퍼즐 완성으로만 얻는 한정 종"
            >
              ✨ 한정
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
          {showStages ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] text-gray-400">
              {species.max_stage}단계
            </span>
          ) : null}
        </div>

        {/* 성장 스트립 — 클릭 시 크게 미리보기 (히든/단일 형태 종은 미표시) */}
        {showStages ? (
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">
              성장 단계 (클릭)
            </div>
            <StageStrip
              svgKey={species.svg_key}
              category={species.category}
              maxStage={species.max_stage}
              stageNames={stageNames}
              speciesName={species.name}
              tint={species.tint}
            />
          </div>
        ) : null}

        {grantPuzzleName ? (
          <div
            className="text-[10px] text-violet-300 truncate"
            title={`"${grantPuzzleName}" 퍼즐 완성 시 지급`}
          >
            🧩 보상 퍼즐 · {grantPuzzleName}
          </div>
        ) : null}

        {showStages && finalStage ? (
          <div className="text-[10px] text-gray-500 truncate">
            성숙: {finalStage}
          </div>
        ) : null}

        {/* 재심기 비용 — 브랜드(비변이) 종만: 퍼즐 해금 후 씨앗으로 재획득 */}
        {species.is_brand && !species.is_variant ? (
          <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-2">
            <span className="text-[10px] text-gray-500">재심기 비용</span>
            <PlantCostEditor
              speciesId={species.id}
              cost={species.plant_cost}
              manual={species.plant_cost_manual}
            />
          </div>
        ) : null}

        <div
          className="flex items-center justify-between pt-1 border-t border-white/5 mt-2"
          title="전체 유저 정원에 심긴 이 종의 그루 수 (그중 최종 단계까지 자란 수)"
        >
          <span className="text-[10px] text-gray-500">전체 정원에 심긴 수</span>
          <span className="text-xs font-mono text-emerald-200">
            {total.toLocaleString()}그루
            {mature > 0 ? (
              <span className="text-yellow-200 ml-1">
                · 성숙 {mature.toLocaleString()}
              </span>
            ) : null}
          </span>
        </div>
      </div>
      <PublishToggle
        speciesId={species.id}
        isPublished={species.is_published}
      />
    </div>
  );
}
