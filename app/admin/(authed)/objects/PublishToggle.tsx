"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** 정원 종 공개/미공개 토글 — 미공개면 앱에 안 보임 (RLS 게이트) */
export default function PublishToggle({
  speciesId,
  isPublished,
}: {
  speciesId: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (
      isPublished &&
      !window.confirm(
        "이 종을 미공개로 전환할까요? 앱 심기 목록·보상 노출에서 즉시 사라집니다."
      )
    )
      return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/garden-species/${speciesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !isPublished }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(data.error ?? "변경 실패");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      alert("네트워크 오류");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`w-full inline-flex items-center justify-center gap-1.5 h-8 text-[11px] font-medium border-t border-white/5 transition-colors ${
        isPublished
          ? "text-gray-400 hover:bg-white/[0.04] hover:text-white"
          : "text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
      }`}
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {isPublished ? "미공개로 전환" : "앱에 공개하기"}
    </button>
  );
}
