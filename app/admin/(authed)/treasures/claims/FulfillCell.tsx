"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Undo2 } from "lucide-react";

type Props = {
  treasureId: string;
  /** 경품이 아니면 수령 개념이 없어 "—" */
  isPrize: boolean;
  fulfilledAt: string | null;
  note: string | null;
};

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 경품 수령 완료 체크 + 메모. 저장은 PATCH /api/admin/treasures/claims/[id]/fulfill */
export default function FulfillCell({ treasureId, isPrize, fulfilledAt, note }: Props) {
  const [done, setDone] = useState<string | null>(fulfilledAt);
  const [memo, setMemo] = useState<string>(note ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPrize) {
    return <span className="text-gray-600 text-xs">—</span>;
  }

  async function save(nextFulfilled: boolean, nextNote: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/treasures/claims/${treasureId}/fulfill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfilled: nextFulfilled, note: nextNote }),
      });
      const d = (await res.json()) as {
        error?: string;
        fulfilled_at?: string | null;
        fulfill_note?: string | null;
      };
      if (!res.ok) {
        setError(d.error ?? "저장 실패");
        return;
      }
      setDone(d.fulfilled_at ?? null);
      setMemo(d.fulfill_note ?? "");
      setEditing(false);
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      <div className="flex items-center gap-2">
        {done ? (
          <>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium whitespace-nowrap">
              <Check className="h-3 w-3" />
              수령 완료
            </span>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">{fmt(done)}</span>
            <button
              type="button"
              title="수령 취소"
              disabled={busy}
              onClick={() => {
                if (confirm("수령 완료를 취소할까요?")) void save(false, memo);
              }}
              className="text-gray-500 hover:text-red-300 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(true, memo)}
            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md border border-white/10 bg-white/[0.04] hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-200 text-gray-300 text-[11px] font-medium transition disabled:opacity-40 whitespace-nowrap"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            수령 완료
          </button>
        )}
      </div>

      {editing ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            void save(!!done, memo);
          }}
        >
          <input
            autoFocus
            value={memo}
            maxLength={200}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 (송장번호, 현장 전달 등)"
            className="h-7 flex-1 min-w-0 px-2 rounded-md bg-white/[0.04] border border-white/10 text-white text-[11px] placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-7 px-2 rounded-md bg-white/[0.08] hover:bg-white/[0.12] text-white text-[11px] disabled:opacity-40"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setMemo(note ?? memo);
            }}
            className="h-7 px-2 rounded-md text-gray-400 hover:text-white text-[11px]"
          >
            취소
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 text-left"
        >
          <Pencil className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[200px]">{memo || "메모 추가"}</span>
        </button>
      )}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
