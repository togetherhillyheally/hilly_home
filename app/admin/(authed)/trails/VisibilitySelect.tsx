"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe, Link as LinkIcon, Lock, Loader2 } from "lucide-react";
import { buildTrailShareUrl } from "@/lib/links";

export type Visibility = "public" | "unlisted" | "private";

const META: Record<
  Visibility,
  { label: string; short: string; hint: string; icon: typeof Globe; badgeClass: string }
> = {
  public: {
    label: "전체 공개",
    short: "전체",
    hint: "목록·검색에 노출됩니다.",
    icon: Globe,
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  unlisted: {
    label: "링크 공유",
    short: "링크",
    hint: "목록·검색엔 안 뜨고 링크 아는 사람만 열람할 수 있어요.",
    icon: LinkIcon,
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  private: {
    label: "나만 (비공개)",
    short: "비공개",
    hint: "소유자만 볼 수 있어요.",
    icon: Lock,
    badgeClass: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  },
};

const ORDER: Visibility[] = ["public", "unlisted", "private"];

export function VisibilityBadge({ value }: { value: Visibility }) {
  const m = META[value];
  const Icon = m.icon;
  return (
    <span
      title={m.hint}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${m.badgeClass}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {m.short}
    </span>
  );
}

export default function VisibilitySelect({
  trailId,
  initial,
  size = "sm",
}: {
  trailId: string;
  initial: Visibility;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState<Visibility>(initial);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const change = async (next: Visibility) => {
    if (next === value) return;
    const prev = value;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/trails/${trailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        alert(d.error ?? "변경 실패");
        setValue(prev);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      alert("네트워크 오류");
      setValue(prev);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildTrailShareUrl(trailId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("클립보드 복사 실패");
    }
  };

  const heightCls = size === "md" ? "h-9" : "h-7 text-xs";
  const padCls = size === "md" ? "px-3" : "px-2";

  return (
    <div className="inline-flex items-center gap-1.5">
      <select
        value={value}
        onChange={(e) => change(e.target.value as Visibility)}
        disabled={saving}
        className={`${heightCls} ${padCls} rounded-md bg-white/[0.05] border border-white/10 text-white focus:outline-none focus:border-orange-400/50 disabled:opacity-50`}
      >
        {ORDER.map((v) => (
          <option key={v} value={v} className="bg-[#0c0c14]">
            {META[v].label}
          </option>
        ))}
      </select>
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
      ) : null}
      {value === "unlisted" ? (
        <button
          type="button"
          onClick={copy}
          title="공유 링크 복사"
          className={`${heightCls} ${padCls} inline-flex items-center gap-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-gray-200`}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" /> 복사됨
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> 링크
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
