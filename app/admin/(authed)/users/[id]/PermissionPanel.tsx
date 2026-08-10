"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  MENU_KEYS,
  SCOPABLE_MENU_KEYS,
  defaultMenuKeysForTier,
  type AdminTier,
  type MenuKey,
} from "@/lib/admin-permissions";

const TIER_OPTIONS: { value: AdminTier | ""; label: string }[] = [
  { value: "", label: "user — 일반유저 (BO 접근 불가)" },
  { value: "master", label: "master — 전체 + 권한 관리" },
  { value: "admin", label: "admin — 전체 메뉴" },
  { value: "manager", label: "manager — 운영/콘텐츠/퍼즐" },
  { value: "client", label: "client — 지정한 메뉴만" },
];

export type MenuOverride = { menu_key: string; allowed: boolean };
export type PuzzleOption = { id: string; name: string };

type Props = {
  userId: string;
  isSelf: boolean;
  initialTier: AdminTier | null;
  initialOverrides: MenuOverride[];
  initialScope: string[]; // puzzle-progress 스코프의 puzzle id 목록
  menuLabels: Record<string, string>;
  puzzleOptions: PuzzleOption[];
};

export default function PermissionPanel({
  userId,
  isSelf,
  initialTier,
  initialOverrides,
  initialScope,
  menuLabels,
  puzzleOptions,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const initialAllowed = useMemo(() => {
    const defaults = defaultMenuKeysForTier(initialTier ?? "client");
    const overrideMap = new Map(
      initialOverrides.map((o) => [o.menu_key, o.allowed])
    );
    const map: Partial<Record<MenuKey, boolean>> = {};
    for (const key of MENU_KEYS) {
      map[key] = overrideMap.get(key) ?? defaults.has(key);
    }
    return map as Record<MenuKey, boolean>;
  }, [initialTier, initialOverrides]);

  const [tier, setTier] = useState<AdminTier | null>(initialTier);
  const [checkedMenus, setCheckedMenus] =
    useState<Record<MenuKey, boolean>>(initialAllowed);
  const [scopeSelected, setScopeSelected] = useState<Set<string>>(
    new Set(initialScope)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    tier !== initialTier ||
    MENU_KEYS.some((k) => checkedMenus[k] !== initialAllowed[k]) ||
    scopeSelected.size !== initialScope.length ||
    initialScope.some((id) => !scopeSelected.has(id));

  const onTierChange = (next: AdminTier | "") => {
    const nextTier = next === "" ? null : next;
    setTier(nextTier);
    // 등급이 바뀌면 저장 전 미리보기를 새 등급의 기본 메뉴로 맞춰줌 (아직 저장 전이라 취소 가능)
    const defaults = defaultMenuKeysForTier(nextTier ?? "client");
    const next2: Partial<Record<MenuKey, boolean>> = {};
    for (const key of MENU_KEYS) next2[key] = defaults.has(key);
    setCheckedMenus(next2 as Record<MenuKey, boolean>);
  };

  const toggleMenu = (key: MenuKey, next: boolean) => {
    setCheckedMenus((prev) => ({ ...prev, [key]: next }));
  };

  const toggleScope = (resourceId: string, add: boolean) => {
    setScopeSelected((prev) => {
      const next = new Set(prev);
      if (add) next.add(resourceId);
      else next.delete(resourceId);
      return next;
    });
  };

  const reset = () => {
    setTier(initialTier);
    setCheckedMenus(initialAllowed);
    setScopeSelected(new Set(initialScope));
    setError(null);
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const requests: Promise<Response>[] = [];

      if (tier !== initialTier) {
        requests.push(
          fetch(`/api/admin/users/${userId}/admin-tier`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier }),
          })
        );
      }

      const finalDefaults = defaultMenuKeysForTier(tier ?? "client");
      for (const key of MENU_KEYS) {
        const desired = checkedMenus[key];
        if (desired === initialAllowed[key]) continue;
        if (desired === finalDefaults.has(key)) {
          requests.push(
            fetch(`/api/admin/users/${userId}/menu-access?menu_key=${key}`, {
              method: "DELETE",
            })
          );
        } else {
          requests.push(
            fetch(`/api/admin/users/${userId}/menu-access`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ menu_key: key, allowed: desired }),
            })
          );
        }
      }

      for (const key of SCOPABLE_MENU_KEYS) {
        // 지금은 puzzle-progress 하나뿐이라 initialScope 를 그대로 이 메뉴 기준으로 사용
        const initialSet = new Set(initialScope);
        for (const id of scopeSelected) {
          if (!initialSet.has(id)) {
            requests.push(
              fetch(`/api/admin/users/${userId}/menu-scope`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ menu_key: key, resource_id: id }),
              })
            );
          }
        }
        for (const id of initialSet) {
          if (!scopeSelected.has(id)) {
            requests.push(
              fetch(
                `/api/admin/users/${userId}/menu-scope?menu_key=${key}&resource_id=${id}`,
                { method: "DELETE" }
              )
            );
          }
        }
      }

      if (requests.length === 0) return;

      const results = await Promise.all(requests);
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const data = (await failed.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "일부 변경 저장에 실패했어요.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("네트워크 오류");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
        <ShieldCheck className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-white">권한 관리</h2>
        <span className="text-[11px] text-gray-500">· master 전용</span>
      </div>

      <div className="p-5 space-y-5">
        {/* 등급 */}
        <div>
          <div className="text-xs text-gray-400 mb-1.5">등급</div>
          <select
            value={tier ?? ""}
            disabled={saving || (isSelf && initialTier === "master")}
            onChange={(e) => onTierChange(e.target.value as AdminTier | "")}
            className="w-full max-w-sm h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50 disabled:opacity-50"
          >
            {TIER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#161616]">
                {o.label}
              </option>
            ))}
          </select>
          {isSelf && initialTier === "master" ? (
            <p className="text-[11px] text-gray-500 mt-1">
              본인의 master 등급은 변경할 수 없어요.
            </p>
          ) : null}
        </div>

        {/* 메뉴 접근 */}
        {tier ? (
          <div>
            <div className="text-xs text-gray-400 mb-1.5">메뉴 접근</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {MENU_KEYS.map((key) => {
                const checked = checkedMenus[key];
                return (
                  <label
                    key={key}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-gray-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving}
                      onChange={(e) => toggleMenu(key, e.target.checked)}
                      className="accent-orange-500"
                    />
                    <span className="truncate">{menuLabels[key] ?? key}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 스코프 (puzzle-progress 등 리소스 제한이 필요한 메뉴) */}
        {tier &&
          SCOPABLE_MENU_KEYS.filter((key) => checkedMenus[key]).map((key) => (
            <div key={key}>
              <div className="text-xs text-gray-400 mb-1.5">
                {menuLabels[key] ?? key} — 조회 가능한 퍼즐
                <span className="text-gray-600">
                  {" "}
                  (비워두면 {tier === "client" ? "0건" : "전체 조회"})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {puzzleOptions.map((p) => {
                  const checked = scopeSelected.has(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-gray-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving}
                        onChange={(e) => toggleScope(p.id, e.target.checked)}
                        className="accent-orange-500"
                      />
                      <span className="truncate max-w-[160px]">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

        {error ? (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
          <button
            type="button"
            onClick={reset}
            disabled={!dirty || saving}
            className="px-4 h-9 mt-4 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 text-gray-300 text-sm"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-4 h-9 mt-4 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-black text-sm font-medium"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            저장
          </button>
        </div>
      </div>
    </section>
  );
}
