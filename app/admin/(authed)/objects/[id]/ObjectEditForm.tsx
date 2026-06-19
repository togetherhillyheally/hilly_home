"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ImagePlus,
} from "lucide-react";
import AutocompleteInput, {
  invalidateAutocompleteCache,
} from "@/components/admin/AutocompleteInput";
import {
  COMMON_OBJECT_SEASONS,
  seasonLabel,
} from "@/lib/basecamp-object-constants";

type Props = {
  objectId: string;
  initialName: string;
  initialCategory: string;
  initialSeason: string | null;
  initialSortOrder: number;
  initialUnlockCost: number;
  initialDesignKey: string | null;
  imageUrl: string;
  storagePath: string;
};

export default function ObjectEditForm({
  objectId,
  initialName,
  initialCategory,
  initialSeason,
  initialSortOrder,
  initialUnlockCost,
  initialDesignKey,
  imageUrl,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [season, setSeason] = useState(initialSeason ?? "");
  const [sortOrder, setSortOrder] = useState(String(initialSortOrder));
  const [unlockCost, setUnlockCost] = useState(String(initialUnlockCost));
  const [designKey, setDesignKey] = useState(initialDesignKey ?? "");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [replacing, startReplace] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const showInfo = (msg: string) => {
    setInfo(msg);
    setTimeout(() => setInfo(null), 2500);
  };

  const dirty =
    name.trim() !== initialName ||
    category.trim() !== initialCategory ||
    (season.trim() || null) !== initialSeason ||
    Number(sortOrder) !== initialSortOrder ||
    Number(unlockCost) !== initialUnlockCost ||
    (designKey.trim() || null) !== initialDesignKey;

  const save = () => {
    if (!name.trim() || !category.trim()) {
      setError("이름과 카테고리는 필수입니다.");
      return;
    }
    setError(null);
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/basecamp-objects/${objectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            category: category.trim(),
            season: season.trim() || null,
            sort_order: Number(sortOrder),
            unlock_cost: Number(unlockCost),
            design_key: designKey.trim() || null,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "저장 실패");
          return;
        }
        if (category.trim() !== initialCategory) {
          invalidateAutocompleteCache("basecamp-categories");
        }
        showInfo("저장되었습니다.");
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  };

  const replaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }
    setError(null);
    const form = new FormData();
    form.append("image", file);
    startReplace(async () => {
      try {
        const res = await fetch(
          `/api/admin/basecamp-objects/${objectId}/image`,
          { method: "POST", body: form }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "교체 실패");
          return;
        }
        showInfo("이미지가 교체되었습니다.");
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "교체 실패");
      }
    });
  };

  const remove = () => {
    setError(null);
    startDelete(async () => {
      try {
        const res = await fetch(`/api/admin/basecamp-objects/${objectId}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "삭제 실패");
          return;
        }
        router.push("/admin/objects");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "삭제 실패");
      }
    });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6">
      {/* Left: 이미지 + 교체 */}
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="aspect-square rounded-lg overflow-hidden bg-checkerboard relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={initialName}
              className="w-full h-full object-contain"
            />
            {replacing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-medium gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                교체 중…
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              disabled={replacing || saving || deleting}
              className="flex-1 h-9 rounded-md bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-50 text-white text-xs inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              이미지 교체
            </button>
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={replaceImage}
            />
          </div>
        </div>
      </div>

      {/* Right: 메타 편집 + 삭제 */}
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            정보 수정
          </h3>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              이름 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              카테고리 <span className="text-red-400">*</span>
            </label>
            <AutocompleteInput
              value={category}
              onChange={setCategory}
              fetchUrl="/api/admin/basecamp-objects/categories"
              cacheKey="basecamp-categories"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">계절</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
            >
              <option value="">선택 안 함</option>
              {COMMON_OBJECT_SEASONS.map((s) => (
                <option key={s} value={s}>
                  {seasonLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                정렬 순서
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                잠금해제 비용
              </label>
              <input
                type="number"
                min={0}
                value={unlockCost}
                onChange={(e) => setUnlockCost(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              design_key
            </label>
            <input
              type="text"
              value={designKey}
              onChange={(e) => setDesignKey(e.target.value)}
              placeholder="예: maple_tree_v1"
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50 font-mono"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{info}</span>
            </div>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="w-full h-10 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-white/[0.06] disabled:text-gray-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                저장 중…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                변경사항 저장
              </>
            )}
          </button>
        </div>

        {/* 위험 구역 */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-5">
          <h3 className="text-xs text-red-300 font-medium mb-2 uppercase tracking-wider">
            위험 구역
          </h3>
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            오브젝트와 Storage 의 이미지가 영구 삭제됩니다. 사용자 캠프에 이미
            배치된 오브젝트는 그대로 남지만, 카탈로그에서는 더 이상 사용할 수
            없습니다.
          </p>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full h-10 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-200 text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              이 오브젝트 삭제…
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-200 font-medium">정말 삭제할까요?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-sm inline-flex items-center justify-center gap-2"
                >
                  <X className="h-4 w-4" />
                  취소
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={deleting}
                  className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 disabled:bg-red-500/40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      삭제 중…
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      영구 삭제
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
