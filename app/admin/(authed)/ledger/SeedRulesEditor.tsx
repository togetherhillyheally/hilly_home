"use client";

/**
 * 거리별 씨앗 지급 규칙 편집 — garden_seed_reward_rules/settings 를 RPC 로 갱신.
 * 저장 즉시 서버 earn_seeds(calc_garden_seeds) 와 앱 라이브 칩 추정에 반영됩니다.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { gardenSeedsForKm, type SeedRules } from "./seedRules";

type TierDraft = { uptoKm: string; seedsPerKm: string };

function toDrafts(rules: SeedRules): TierDraft[] {
  return rules.tiers.map((t) => ({
    uptoKm: t.uptoKm == null ? "" : String(t.uptoKm),
    seedsPerKm: String(t.seedsPerKm),
  }));
}

export default function SeedRulesEditor({ rules }: { rules: SeedRules }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [tiers, setTiers] = useState<TierDraft[]>(() => toDrafts(rules));
  const [minGuarantee, setMinGuarantee] = useState(String(rules.minGuarantee));
  const [minDistanceKm, setMinDistanceKm] = useState(
    String(rules.minDistanceKm)
  );

  const dirty =
    JSON.stringify(tiers) !== JSON.stringify(toDrafts(rules)) ||
    minGuarantee !== String(rules.minGuarantee) ||
    minDistanceKm !== String(rules.minDistanceKm);

  // 클라 검증 — 서버 RPC 가 최종 검증하지만 흔한 실수는 미리 안내
  const validationError = (() => {
    if (tiers.length < 1 || tiers.length > 10)
      return "구간은 1~10개여야 해요.";
    let prev = 0;
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const rate = Number(t.seedsPerKm);
      if (t.seedsPerKm.trim() === "" || !Number.isFinite(rate) || rate < 0 || rate > 100)
        return `${i + 1}구간의 1km 당 씨앗은 0~100 사이여야 해요.`;
      if (t.uptoKm.trim() === "") {
        if (i !== tiers.length - 1)
          return "무제한(빈칸) 구간은 마지막에만 둘 수 있어요.";
      } else {
        const upto = Number(t.uptoKm);
        if (!Number.isFinite(upto) || upto <= prev)
          return `${i + 1}구간의 상한 km 는 이전 구간보다 커야 해요.`;
        prev = upto;
      }
    }
    const mg = Number(minGuarantee);
    if (!Number.isInteger(mg) || mg < 0)
      return "최소 보장 씨앗은 0 이상의 정수여야 해요.";
    const md = Number(minDistanceKm);
    if (!Number.isFinite(md) || md < 0)
      return "최소 보장 거리는 0 이상이어야 해요.";
    return null;
  })();

  // 미리보기 — 현재 입력값으로 대표 거리 계산
  const previewRules: SeedRules | null = validationError
    ? null
    : {
        tiers: tiers.map((t) => ({
          uptoKm: t.uptoKm.trim() === "" ? null : Number(t.uptoKm),
          seedsPerKm: Number(t.seedsPerKm),
        })),
        minGuarantee: Number(minGuarantee),
        minDistanceKm: Number(minDistanceKm),
      };

  const save = async () => {
    if (validationError || !previewRules) {
      setErrorMsg(validationError ?? "");
      return;
    }
    setErrorMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/seed-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: previewRules.tiers.map((t) => ({
            upto_km: t.uptoKm,
            seeds_per_km: t.seedsPerKm,
          })),
          min_guarantee: previewRules.minGuarantee,
          min_distance_km: previewRules.minDistanceKm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "저장 실패");
        return;
      }
      setSavedAt(Date.now());
      startTransition(() => router.refresh());
    } catch {
      setErrorMsg("네트워크 오류");
    } finally {
      setSaving(false);
    }
  };

  const setTier = (i: number, patch: Partial<TierDraft>) => {
    setTiers((prev) =>
      prev.map((t, j) => (j === i ? { ...t, ...patch } : t))
    );
  };

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Settings2 className="h-4 w-4 text-orange-300" />
          씨앗 지급 규칙 설정
          <span className="text-[11px] font-normal text-gray-500">
            저장 즉시 서버 지급 공식에 반영
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
          {/* 구간 목록 */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
              거리 구간 (앞 구간 상한 → 이 구간 상한, 마지막은 빈칸 = 무제한)
            </div>
            <div className="space-y-1.5">
              {tiers.map((t, i) => {
                const from =
                  i === 0 ? 0 : Number(tiers[i - 1].uptoKm) || 0;
                const isLast = i === tiers.length - 1;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-14 text-right text-[11px] font-mono text-gray-500 flex-shrink-0">
                      {from}km ~
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={t.uptoKm}
                      placeholder={isLast ? "무제한" : "상한 km"}
                      onChange={(e) => setTier(i, { uptoKm: e.target.value })}
                      className="w-24 h-9 px-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
                    />
                    <span className="text-[11px] text-gray-500 flex-shrink-0">
                      km 까지 · 1km 당 🌱
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={t.seedsPerKm}
                      onChange={(e) =>
                        setTier(i, { seedsPerKm: e.target.value })
                      }
                      className="w-20 h-9 px-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTiers((prev) => prev.filter((_, j) => j !== i))
                      }
                      disabled={tiers.length <= 1}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-300 hover:bg-white/[0.04] disabled:opacity-30"
                      title="구간 삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                setTiers((prev) => {
                  const next = [...prev];
                  // 마지막(무제한) 앞에 새 구간 삽입
                  next.splice(next.length - 1, 0, {
                    uptoKm: "",
                    seedsPerKm: "1",
                  });
                  return next;
                })
              }
              disabled={tiers.length >= 10}
              className="mt-2 inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-gray-300 hover:text-white disabled:opacity-30"
            >
              <Plus className="h-3 w-3" /> 구간 추가
            </button>
          </div>

          {/* 최소 보장 */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input
                type="number"
                min={0}
                step={0.1}
                value={minDistanceKm}
                onChange={(e) => setMinDistanceKm(e.target.value)}
                className="w-20 h-9 px-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
              />
              km 이상 이동 시
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              최소 🌱
              <input
                type="number"
                min={0}
                step={1}
                value={minGuarantee}
                onChange={(e) => setMinGuarantee(e.target.value)}
                className="w-20 h-9 px-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
              />
              보장
            </label>
          </div>

          {/* 미리보기 */}
          {previewRules ? (
            <div className="flex flex-wrap gap-1.5">
              {[1, 3, 5, 10, 15, 20, 50].map((d) => (
                <span
                  key={d}
                  className="px-2 py-1 rounded-md bg-white/[0.03] border border-white/10 text-[11px] font-mono text-gray-300"
                >
                  {d}km → 🌱{gardenSeedsForKm(d, previewRules)}
                </span>
              ))}
            </div>
          ) : null}

          {errorMsg || validationError ? (
            <p className="text-xs text-red-400">
              {errorMsg || validationError}
            </p>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-600 leading-relaxed max-w-md">
              저장하면 서버 지급 공식(earn_seeds)과 앱 화면의 씨앗 추정치에
              바로 적용돼요. 이미 지급된 내역은 변하지 않아요.
            </p>
            <div className="flex items-center gap-3">
              {savedAt && !dirty ? (
                <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
                  <Check className="h-3 w-3" /> 저장됨
                </span>
              ) : null}
              <button
                onClick={save}
                disabled={!dirty || saving || !!validationError}
                className="px-4 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white text-sm font-medium disabled:opacity-40"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> 저장 중...
                  </span>
                ) : (
                  "규칙 저장"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
