"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, RotateCcw, X } from "lucide-react";

/**
 * 브랜드 종 재심기 비용(plant_cost) 인라인 편집기.
 * 수동 지정 시 이후 퍼즐 연결/크기 변경에도 자동 재계산되지 않음 (수동 badge).
 * 재계산 버튼 → round(연결 퍼즐 max 조각 × 1.5), 미연결이면 30.
 */
export default function PlantCostEditor({
  speciesId,
  cost,
  manual,
}: {
  speciesId: string;
  cost: number;
  manual: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(cost));
  const [pending, setPending] = useState(false);

  const save = async () => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
      alert("0 이상의 정수를 입력하세요.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/admin/garden-species/${speciesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plant_cost: n }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(data.error ?? "저장 실패");
        return;
      }
      setEditing(false);
      startTransition(() => router.refresh());
    } catch {
      alert("네트워크 오류");
    } finally {
      setPending(false);
    }
  };

  const recalc = async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/garden-species/${speciesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recalc_plant_cost: true }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(data.error ?? "재계산 실패");
        return;
      }
      const data = (await res.json()) as { plant_cost?: number };
      if (typeof data.plant_cost === "number") setValue(String(data.plant_cost));
      setEditing(false);
      startTransition(() => router.refresh());
    } catch {
      alert("네트워크 오류");
    } finally {
      setPending(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            else if (e.key === "Escape") setEditing(false);
          }}
          min={0}
          step={1}
          autoFocus
          className="w-16 h-6 px-1.5 rounded bg-white/[0.06] border border-emerald-500/40 text-white text-xs font-mono focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="w-5 h-5 inline-flex items-center justify-center rounded text-emerald-300 hover:bg-emerald-500/20"
          aria-label="저장"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(String(cost));
            setEditing(false);
          }}
          className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-500 hover:bg-white/10"
          aria-label="취소"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono text-emerald-200">
        🌱 {cost.toLocaleString()}
      </span>
      {manual ? (
        <span
          className="px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-medium border border-amber-500/30"
          title="관리자 수동 지정 — 자동 재계산 제외"
        >
          수동
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setValue(String(cost));
          setEditing(true);
        }}
        className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-white/10"
        aria-label="비용 수정"
      >
        <Pencil className="h-3 w-3" />
      </button>
      {manual ? (
        <button
          type="button"
          onClick={recalc}
          disabled={pending}
          className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-500 hover:text-emerald-300 hover:bg-white/10"
          title="자동값으로 재계산 (조각 수 × 1.5)"
          aria-label="재계산"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
        </button>
      ) : null}
    </div>
  );
}
