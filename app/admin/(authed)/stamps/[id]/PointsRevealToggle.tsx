"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Lock } from "lucide-react";

type Reveal = "always" | "on_start";

const OPTIONS: { value: Reveal; label: string; icon: typeof Eye }[] = [
  { value: "on_start", label: "모험 시작 시 공개", icon: Lock },
  { value: "always", label: "항상 공개", icon: Eye },
];

/**
 * 포인트 위치 공개 시점 (2026-11-16) — 항상 공개면 시작 전부터 누구에게나 위치·점수·썸네일 핀이 보인다.
 * 바꾸면 서버가 썸네일도 핀/범위로 다시 그린다.
 */
export default function PointsRevealToggle({
  trailId,
  initial,
}: {
  trailId: string;
  initial: Reveal;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Reveal>(initial);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pick = (next: Reveal) => {
    if (next === value || saving) return;
    const prev = value;
    setValue(next);
    setError(null);
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points_reveal: next }),
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => null)) as { error?: string } | null;
          setValue(prev);
          setError(d?.error ?? `저장 실패 (${res.status})`);
          return;
        }
        router.refresh();
      } catch (e) {
        setValue(prev);
        setError(e instanceof Error ? e.message : "네트워크 오류");
      }
    });
  };

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <div className="inline-flex rounded-md border border-white/10 bg-white/[0.04] p-0.5">
        {OPTIONS.map((o) => {
          const active = value === o.value;
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              disabled={saving}
              className={`h-6 px-2 rounded text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
                active ? "bg-orange-500/20 text-orange-200" : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="h-3 w-3" />
              {o.label}
            </button>
          );
        })}
      </div>
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
