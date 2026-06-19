"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  Loader2,
  AlertCircle,
  ImageIcon,
  X,
  ArrowRight,
} from "lucide-react";
import AutocompleteInput, {
  invalidateAutocompleteCache,
} from "@/components/admin/AutocompleteInput";
import {
  COMMON_OBJECT_SEASONS,
  seasonLabel,
} from "@/lib/basecamp-object-constants";

export default function NewObjectForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [unlockCost, setUnlockCost] = useState("");
  const [designKey, setDesignKey] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ingestFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }
    setError(null);
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  }, [preview]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) ingestFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) ingestFile(f);
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
  };

  const submit = () => {
    if (!file) {
      setError("이미지 파일을 첨부해주세요.");
      return;
    }
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!category.trim()) {
      setError("카테고리를 입력해주세요.");
      return;
    }
    setError(null);

    const form = new FormData();
    form.append("image", file);
    form.append("name", name.trim());
    form.append("category", category.trim());
    if (season.trim()) form.append("season", season.trim());
    if (sortOrder.trim()) form.append("sort_order", sortOrder.trim());
    if (unlockCost.trim()) form.append("unlock_cost", unlockCost.trim());
    if (designKey.trim()) form.append("design_key", designKey.trim());

    startSubmit(async () => {
      try {
        const res = await fetch("/api/admin/basecamp-objects", {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "등록 실패");
          return;
        }
        // 자동완성 캐시 무효화 (새 카테고리 추가될 수 있음)
        invalidateAutocompleteCache("basecamp-categories");
        router.push(`/admin/objects/${data.object.id}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "등록 실패");
      }
    });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      {/* Left: 이미지 업로드 + 미리보기 */}
      <div className="space-y-4">
        {!preview ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver
                ? "border-orange-500/60 bg-orange-500/[0.06]"
                : "border-white/15 bg-white/[0.02]"
            }`}
          >
            <UploadCloud className="h-10 w-10 text-gray-500 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">
              이미지를 끌어다 놓거나 클릭해서 선택
            </p>
            <p className="text-xs text-gray-500 mb-4">PNG · WebP · JPG · SVG</p>
            <label className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm cursor-pointer">
              <ImageIcon className="h-4 w-4" />
              파일 선택
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileInput}
              />
            </label>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-checkerboard relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt=""
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-red-500 text-white inline-flex items-center justify-center transition"
                aria-label="이미지 제거"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span className="truncate flex-1">{file?.name}</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-3 px-2.5 h-7 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white"
              >
                다른 파일
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileInput}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right: 메타정보 + 제출 */}
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              이름 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 단풍나무"
              disabled={submitting}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
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
              placeholder="예: nature, tent, gear"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              계절 (선택)
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              disabled={submitting}
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
                placeholder="0"
                disabled={submitting}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
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
                placeholder="0"
                disabled={submitting}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              design_key (선택)
            </label>
            <input
              type="text"
              value={designKey}
              onChange={(e) => setDesignKey(e.target.value)}
              placeholder="예: maple_tree_v1"
              disabled={submitting}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50 font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={submitting || !file || !name.trim() || !category.trim()}
          className="w-full h-11 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-white/[0.06] disabled:text-gray-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              등록 중…
            </>
          ) : (
            <>
              등록하기
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
