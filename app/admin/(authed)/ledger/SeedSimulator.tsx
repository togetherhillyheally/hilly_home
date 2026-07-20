"use client";

/**
 * 모험 씨앗 획득 시뮬레이터 — 거리 → 정원 씨앗 미리보기.
 * 규칙은 DB(garden_seed_reward_rules)에서 내려와 props 로 주입 — 서버 calc_garden_seeds 와 동일 곡선.
 */
import { useState } from "react";
import { ChevronDown, Footprints, Users } from "lucide-react";
import {
  DEFAULT_SEED_RULES,
  gardenSeedsForKm,
  type SeedRules,
} from "./seedRules";

/** 함께 걷기 보너스 — 기본 씨앗의 30%, 최소 3 (2명 이상 함께 적립 시) */
function companionBonus(baseSeeds: number): number {
  return Math.max(3, Math.round(baseSeeds * 0.3));
}

const MAX_KM = 100;

export default function SeedSimulator({
  rules = DEFAULT_SEED_RULES,
}: {
  rules?: SeedRules;
}) {
  const [open, setOpen] = useState(false);
  const [km, setKm] = useState(5);
  const [companion, setCompanion] = useState(false);

  const base = gardenSeedsForKm(km, rules);
  const bonus = companion && km > 0 ? companionBonus(base) : 0;
  const total = km > 0 ? base + bonus : 0;

  const brackets = rules.tiers.map((t, i) => ({
    from: i === 0 ? 0 : rules.tiers[i - 1].uptoKm ?? 0,
    to: t.uptoKm ?? Infinity,
    rate: t.seedsPerKm,
  }));
  const bracket =
    brackets.find((b) => km <= b.to) ?? brackets[brackets.length - 1];

  const presets = [3, 5, 10, 15, 50, 100].map((d) => ({
    d,
    s: gardenSeedsForKm(d, rules),
  }));

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Footprints className="h-4 w-4 text-emerald-300" />
          씨앗 획득 시뮬레이터
          <span className="text-[11px] font-normal text-gray-500">
            거리 → 정원 씨앗 미리보기
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="px-5 pb-5 border-t border-white/5 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            {/* 좌: 컨트롤 */}
            <div className="space-y-4">
              {/* 거리 슬라이더 */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs text-gray-400">
                    이동 거리 (보상 영역 안 기준)
                  </span>
                  <span className="text-lg font-bold font-mono text-white">
                    {km.toFixed(1)}
                    <span className="text-xs font-medium text-gray-500 ml-0.5">
                      km
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={MAX_KM}
                  step={0.1}
                  value={km}
                  onChange={(e) => setKm(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
                {/* 구간 요율 눈금 */}
                <div className="relative h-5 mt-0.5 text-[9px] text-gray-600">
                  {[0, 15, 30, 50, 75, 100].map((t) => (
                    <span
                      key={t}
                      className={`absolute ${t === 0 ? "" : t === 100 ? "-translate-x-full" : "-translate-x-1/2"}`}
                      style={{ left: `${(t / MAX_KM) * 100}%` }}
                    >
                      {t}km
                    </span>
                  ))}
                </div>
              </div>

              {/* 구간 요율 표 */}
              <div
                className="text-[10px] text-gray-500 uppercase tracking-wider"
                title="거리 구간마다 1km 당 적립되는 씨앗 수가 다릅니다 (초반일수록 후함). 현재 거리가 속한 구간이 하이라이트됩니다."
              >
                구간별 적립량 — 현재 구간 하이라이트
              </div>
              <div
                className="grid gap-1.5 !mt-1.5"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(brackets.length, 5)}, minmax(0, 1fr))`,
                }}
              >
                {brackets.map((b, i) => {
                  const active = b === bracket && km > 0;
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border px-2 py-1.5 text-center transition-colors ${
                        active
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <div
                        className={`text-[10px] ${active ? "text-emerald-300" : "text-gray-500"}`}
                      >
                        {b.to === Infinity
                          ? `${b.from}km ~`
                          : `${b.from}~${b.to}km`}
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          active ? "text-white" : "text-gray-400"
                        }`}
                      >
                        1km 당 🌱{" "}
                        <span className="font-bold font-mono">{b.rate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 함께 걷기 토글 */}
              <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 cursor-pointer">
                <span className="flex items-center gap-2 text-sm text-gray-200">
                  <Users className="h-4 w-4 text-orange-300" />
                  함께 걷기 보너스
                  <span className="text-[11px] text-gray-500">
                    2명 이상 동시 적립 시 기본의 30% (최소 3)
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={companion}
                  onChange={(e) => setCompanion(e.target.checked)}
                />
                <span className="w-9 h-5 rounded-full bg-white/10 peer-checked:bg-orange-500/80 transition-colors relative flex-shrink-0">
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      companion ? "translate-x-4" : ""
                    }`}
                  />
                </span>
              </label>

              {/* 결과 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                  <div className="text-[10px] text-gray-500">기본 씨앗</div>
                  <div className="text-xl font-bold font-mono text-white">
                    {km > 0 ? base : 0}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                  <div className="text-[10px] text-gray-500">함께 보너스</div>
                  <div
                    className={`text-xl font-bold font-mono ${bonus > 0 ? "text-orange-300" : "text-gray-600"}`}
                  >
                    {km > 0 ? `+${bonus}` : 0}
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
                  <div className="text-[10px] text-emerald-300">합계</div>
                  <div className="text-xl font-bold font-mono text-emerald-200">
                    🌱 {total}
                  </div>
                </div>
              </div>

              <p className="text-[10px] leading-relaxed text-gray-600">
                세션당 1회 적립(멱등) · {rules.minDistanceKm}km 이상만 최소{" "}
                {rules.minGuarantee} 보장 (미만은 공식값 그대로) ·
                지오펜스(보상 영역) 밖 이동은 미적립 · 실제 지급은 서버
                earn_seeds 가 재계산 — 이 화면은 미리보기입니다.
              </p>
            </div>

            {/* 우: 빠른 프리셋 */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                빠른 선택
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map(({ d, s }) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setKm(d)}
                    className="rounded-lg border border-white/10 bg-white/[0.02] hover:border-emerald-500/40 px-2 py-2"
                  >
                    <div className="text-[10px] text-gray-500">{d}km</div>
                    <div className="text-sm font-mono text-gray-200">🌱 {s}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
