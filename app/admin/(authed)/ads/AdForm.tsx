"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Upload } from "lucide-react";
import {
  AD_KINDS,
  AD_PLACEMENTS,
  type AdCampaignRow,
  type AdPlacement,
  adImageUrl,
} from "@/lib/ads";

type Props = { initial?: AdCampaignRow };

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

/** 광고 등록/수정 폼 — 이미지 업로드(ad-images 버킷) + 자리·기간·가중치·대상 */
export default function AdForm({ initial }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [advertiser, setAdvertiser] = useState(initial?.advertiser ?? "");
  const [linkUrl, setLinkUrl] = useState(initial?.link_url ?? "");
  const [altText, setAltText] = useState(initial?.alt_text ?? "");
  const [placement, setPlacement] = useState<AdPlacement>(initial?.placement ?? "sheet_header");
  const [weight, setWeight] = useState(initial?.weight ?? 1);
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.ends_at ?? null));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [kinds, setKinds] = useState<string[]>(initial?.target_kinds ?? []);
  const [imagePath, setImagePath] = useState(initial?.image_path ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/ads/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!res.ok || !data.path) {
        setError(data.error ?? "업로드 실패");
        return;
      }
      setImagePath(data.path);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return setError("광고 이름을 입력해 주세요.");
    if (!imagePath) return setError("이미지를 올려 주세요.");
    if (linkUrl && !/^https?:\/\//i.test(linkUrl)) return setError("링크는 http(s):// 로 시작해야 해요.");
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      advertiser: advertiser.trim() || null,
      image_path: imagePath,
      link_url: linkUrl.trim() || null,
      alt_text: altText.trim() || null,
      placement,
      weight: Math.min(100, Math.max(1, Number(weight) || 1)),
      starts_at: fromLocalInput(startsAt),
      ends_at: fromLocalInput(endsAt),
      is_active: isActive,
      target_kinds: kinds.length > 0 ? kinds : null,
    };
    try {
      const res = await fetch(initial ? `/api/admin/ads/${initial.id}` : "/api/admin/ads", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "저장 실패");
        return;
      }
      startTransition(() => {
        router.push("/admin/ads");
        router.refresh();
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!initial) return;
    if (!confirm("이 광고를 삭제할까요? 집계도 함께 지워져요.")) return;
    const res = await fetch(`/api/admin/ads/${initial.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "삭제 실패");
      return;
    }
    startTransition(() => {
      router.push("/admin/ads");
      router.refresh();
    });
  };

  const input =
    "w-full h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50";
  const label = "block text-xs font-semibold text-gray-400 mb-1.5";
  const hint = AD_PLACEMENTS.find((p) => p.value === placement)?.hint;

  return (
    <div className="max-w-2xl space-y-6">
      {/* 이미지 */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <p className={label}>이미지 (PNG·JPG·WebP, 2MB 이하) — {hint}</p>
        {imagePath ? (
          <div className="overflow-hidden rounded-lg bg-white/[0.04]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={adImageUrl(imagePath)} alt="" className="w-full object-cover" />
          </div>
        ) : null}
        <label className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-white/15 text-sm text-gray-200 hover:bg-white/[0.05] cursor-pointer">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {imagePath ? "이미지 바꾸기" : "이미지 올리기"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>광고 이름 (내부용)</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 블랙야크 11월 캠페인" />
        </div>
        <div>
          <label className={label}>광고주 (화면에 작게 표시)</label>
          <input className={input} value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} placeholder="예: 블랙야크" />
        </div>
        <div>
          <label className={label}>자리</label>
          <select className={input} value={placement} onChange={(e) => setPlacement(e.target.value as AdPlacement)}>
            {AD_PLACEMENTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>클릭 시 이동 링크 (비우면 클릭 없음)</label>
          <input className={input} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" inputMode="url" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>대체 텍스트</label>
          <input className={input} value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="이미지 내용을 한 줄로" />
        </div>
        <div>
          <label className={label}>시작 (비우면 바로)</label>
          <input type="datetime-local" className={input} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div>
          <label className={label}>종료 (비우면 계속)</label>
          <input type="datetime-local" className={input} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <div>
          <label className={label}>가중치 1~100 (같은 자리 여럿일 때 노출 비율)</label>
          <input type="number" min={1} max={100} className={input} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </div>
        <div>
          <label className={label}>대상 (비우면 전체)</label>
          <div className="flex flex-wrap gap-3 pt-2">
            {AD_KINDS.map((k) => (
              <label key={k.value} className="inline-flex items-center gap-1.5 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={kinds.includes(k.value)}
                  onChange={(e) =>
                    setKinds((prev) => (e.target.checked ? [...prev, k.value] : prev.filter((x) => x !== k.value)))
                  }
                />
                {k.label}
              </label>
            ))}
          </div>
        </div>
        <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-gray-200">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          활성 (끄면 기간과 상관없이 노출 안 함)
        </label>
      </section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex items-center justify-between">
        {initial ? (
          <button
            type="button"
            onClick={() => void remove()}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || uploading}
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-sm font-semibold"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {initial ? "저장" : "등록"}
        </button>
      </div>
    </div>
  );
}
