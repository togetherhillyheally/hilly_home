"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Unlock } from "lucide-react";

export default function CloseToggle({
  slug,
  adminKey,
  initialIsClosed,
  initialReason,
}: {
  slug: string;
  adminKey: string;
  initialIsClosed: boolean;
  initialReason: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isClosed, setIsClosed] = useState(initialIsClosed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !isClosed;
    let reason: string | null = initialReason;
    if (next) {
      const input = window.prompt(
        "마감 사유(선택 · 응답자 안내 화면에 표시)",
        initialReason ?? ""
      );
      if (input === null) return; // 취소
      reason = input.trim() || null;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/survey-status/${encodeURIComponent(slug)}?key=${encodeURIComponent(adminKey)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_closed: next, closed_reason: reason }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "저장 실패");
        return;
      }
      setIsClosed(next);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-9 text-sm font-semibold transition disabled:opacity-50 ${
          isClosed
            ? "bg-emerald-500/90 hover:bg-emerald-500 text-white"
            : "bg-rose-500/90 hover:bg-rose-500 text-white"
        }`}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isClosed ? (
          <Unlock className="h-4 w-4" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        {isClosed ? "모집 재개" : "모집 마감"}
      </button>
      {isClosed ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-rose-500/15 text-rose-300 border-rose-500/30">
          마감됨
        </span>
      ) : null}
      {error ? (
        <span className="text-[11px] text-red-400">{error}</span>
      ) : null}
    </div>
  );
}
