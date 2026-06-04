"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = "basecamp-assets";

function publicImageUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

export type CatalogObject = {
  id: string;
  name: string;
  category: string;
  storage_path: string;
};

export type OwnedObject = CatalogObject & {
  unlocked_at: string;
  source: string | null;
};

export default function InventoryManager({
  userId,
  owned,
  catalog,
}: {
  userId: string;
  owned: OwnedObject[];
  catalog: CatalogObject[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingObj, setPendingObj] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const ownedIds = useMemo(() => new Set(owned.map((o) => o.id)), [owned]);
  const categories = useMemo(
    () => Array.from(new Set(catalog.map((c) => c.category))).sort(),
    [catalog]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (term && !c.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [catalog, search, category]);

  const grant = async (obj: CatalogObject) => {
    setPendingObj(obj.id);
    try {
      const res = await fetch(`/api/admin/users/${userId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object_id: obj.id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(data.error ?? "부여 실패");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      alert("네트워크 오류");
    } finally {
      setPendingObj(null);
    }
  };

  const revoke = async (obj: OwnedObject) => {
    if (!window.confirm(`'${obj.name}' 오브젝트를 회수할까요?`)) return;
    setPendingObj(obj.id);
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/inventory/${obj.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        alert("회수 실패");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      alert("네트워크 오류");
    } finally {
      setPendingObj(null);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <h2 className="text-sm font-semibold text-white">
          캠프 인벤토리 ·{" "}
          <span className="text-gray-500 font-normal">{owned.length}개</span>
        </h2>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-orange-300 hover:text-orange-200"
        >
          <Plus className="h-3 w-3" />
          {pickerOpen ? "닫기" : "오브젝트 부여"}
        </button>
      </div>

      {/* 보유 그리드 */}
      {owned.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-500">
          보유한 오브젝트가 없어요.
        </div>
      ) : (
        <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {owned.map((o) => (
            <div
              key={o.id}
              className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden group relative"
            >
              <div className="aspect-square bg-white/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicImageUrl(o.storage_path)}
                  alt={o.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="p-1.5">
                <div
                  className="text-[11px] text-gray-200 truncate"
                  title={o.name}
                >
                  {o.name}
                </div>
                <div className="text-[9px] text-gray-600 truncate">
                  {o.source ?? "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => revoke(o)}
                disabled={pendingObj === o.id}
                className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/60 hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center"
                aria-label="회수"
              >
                {pendingObj === o.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 오브젝트 picker */}
      {pickerOpen ? (
        <div className="border-t border-white/10 p-4 bg-black/20">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="오브젝트 이름 검색"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <CategoryPill
                value="all"
                current={category}
                onClick={setCategory}
              />
              {categories.map((c) => (
                <CategoryPill
                  key={c}
                  value={c}
                  current={category}
                  onClick={setCategory}
                />
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              조건에 맞는 오브젝트가 없어요.
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[400px] overflow-y-auto pr-1">
              {filtered.map((c) => {
                const isOwned = ownedIds.has(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => grant(c)}
                    disabled={isOwned || pendingObj === c.id}
                    className={`rounded-lg border overflow-hidden text-left transition-colors ${
                      isOwned
                        ? "border-white/5 bg-white/[0.01] opacity-40 cursor-not-allowed"
                        : "border-white/10 bg-white/[0.02] hover:border-orange-500/40 hover:bg-orange-500/[0.06]"
                    }`}
                  >
                    <div className="aspect-square bg-white/[0.04] relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicImageUrl(c.storage_path)}
                        alt={c.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      {isOwned ? (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-[9px] text-emerald-300">
                            보유중
                          </span>
                        </div>
                      ) : pendingObj === c.id ? (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        </div>
                      ) : null}
                    </div>
                    <div className="p-1.5">
                      <div
                        className="text-[10px] text-gray-200 truncate"
                        title={c.name}
                      >
                        {c.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function CategoryPill({
  value,
  current,
  onClick,
}: {
  value: string;
  current: string;
  onClick: (v: string) => void;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`px-2 h-7 inline-flex items-center rounded-md text-[11px] font-medium transition-colors ${
        active
          ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
          : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
      }`}
    >
      {value === "all" ? "전체" : value}
    </button>
  );
}
