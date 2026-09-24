"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TRAIL_SEGMENT_PALETTE } from "@/lib/trail-palette";

export default function SegmentColorToggle({
  trailId,
  initial,
}: {
  trailId: string;
  initial: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const change = async (next: boolean) => {
    if (next === value) return;
    const prev = value;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/trails/${trailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments_colored: next }),
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

  return (
    <div>
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => change(e.target.checked)}
          disabled={saving}
          className="h-4 w-4 accent-rose-500"
        />
        <span className="text-sm text-white">
          세그먼트별 다른 색상으로 표시
        </span>
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
        ) : null}
      </label>
      {value ? (
        <div className="mt-2 inline-flex items-center gap-1">
          {TRAIL_SEGMENT_PALETTE.map((c) => (
            <span
              key={c}
              className="h-3 w-3 rounded-full border border-white/20"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <span className="ml-1.5 text-[11px] text-gray-500">
            {TRAIL_SEGMENT_PALETTE.length}색 순환
          </span>
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-gray-500">
          기본: 전체 경로가 힐리 브랜드 컬러 한 가지로 표시
        </p>
      )}
    </div>
  );
}
