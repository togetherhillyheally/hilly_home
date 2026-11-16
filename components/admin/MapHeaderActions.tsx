"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, X } from "lucide-react";
import TrailActiveToggle from "@/app/admin/(authed)/trails/TrailActiveToggle";

/**
 * 지도 상세 머리줄 — 활성 스위치 + 삭제 (ROUTE 편집 화면용, 2026-11-16).
 * 코스 지도는 EditForm 의 위험 구역에서 지우지만, ROUTE 편집 화면은 지도가 화면을 채워서 머리줄에 둔다.
 */
export default function MapHeaderActions({
  trailId,
  isActive,
  listHref,
}: {
  trailId: string;
  isActive: boolean;
  /** 삭제 후 돌아갈 목록 */
  listHref: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () => {
    setError(null);
    startDelete(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}`, { method: "DELETE" });
        const data = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "삭제 실패");
          return;
        }
        router.push(listHref);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "삭제 실패");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 px-2 h-7 rounded-md bg-white/[0.04] border border-white/10 text-[11px] text-gray-300">
        <TrailActiveToggle trailId={trailId} initial={isActive} />
        {isActive ? "활성" : "비활성"}
      </span>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1 px-2 h-7 rounded-md border border-red-500/30 bg-red-500/[0.06] text-[11px] text-red-300 hover:bg-red-500/15"
        >
          <Trash2 className="h-3.5 w-3.5" />
          삭제
        </button>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
          포인트와 참가 기록까지 영구 삭제돼요. 되돌릴 수 없어요.
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="inline-flex items-center gap-1 px-2 h-6 rounded bg-red-500 hover:bg-red-600 disabled:bg-red-500/40 text-white font-semibold"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            영구 삭제
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="inline-flex items-center gap-1 px-2 h-6 rounded bg-white/[0.06] hover:bg-white/[0.1] text-white"
          >
            <X className="h-3 w-3" />
            취소
          </button>
        </span>
      )}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
