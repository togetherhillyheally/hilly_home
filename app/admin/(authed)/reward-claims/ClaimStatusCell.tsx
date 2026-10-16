"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Undo2, XCircle } from "lucide-react";

type Status = "requested" | "fulfilled" | "cancelled";

type Props = {
  claimId: string;
  status: Status;
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

/** 완주 리워드 신청 상태 전환 + 메모 — PATCH /api/admin/reward-claims/[id] */
export default function ClaimStatusCell({ claimId, status, fulfilledAt, note }: Props) {
  const [st, setSt] = useState<Status>(status);
  const [done, setDone] = useState<string | null>(fulfilledAt);
  const [memo, setMemo] = useState(note ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: Status | null, nextNote: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reward-claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next ?? undefined, note: nextNote }),
      });
      const d = (await res.json()) as {
        error?: string;
        claim?: { status: Status; fulfilled_at: string | null; fulfill_note: string | null };
      };
      if (!res.ok || !d.claim) {
        setError(d.error ?? "저장 실패");
        return;
      }
      setSt(d.claim.status);
      setDone(d.claim.fulfilled_at);
      setMemo(d.claim.fulfill_note ?? "");
      setEditing(false);
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 min-w-[200px]">
      <div className="flex items-center gap-2">
        {st === "fulfilled" ? (
          <>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium whitespace-nowrap">
              <Check className="h-3 w-3" />
              지급 완료
            </span>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">{fmt(done)}</span>
            <button
              type="button"
              title="지급 취소(미지급으로)"
              disabled={busy}
              onClick={() => {
                if (confirm("지급 완료를 취소하고 미지급으로 되돌릴까요?")) void save("requested", memo);
              }}
              className="text-gray-500 hover:text-red-300 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
            </button>
          </>
        ) : st === "cancelled" ? (
          <>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-gray-400 text-[11px] font-medium">
              <XCircle className="h-3 w-3" />
              취소됨
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save("requested", memo)}
              className="text-[11px] text-gray-400 hover:text-white disabled:opacity-40"
            >
              복구
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save("fulfilled", memo)}
              className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md border border-white/10 bg-white/[0.04] hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-200 text-gray-300 text-[11px] font-medium transition disabled:opacity-40 whitespace-nowrap"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              지급 완료
            </button>
            <button
              type="button"
              title="신청 취소"
              disabled={busy}
              onClick={() => {
                if (confirm("이 신청을 취소할까요? 사용자가 다시 신청하면 복구돼요.")) void save("cancelled", memo);
              }}
              className="text-gray-500 hover:text-red-300 disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {editing ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            void save(null, memo);
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
          <button type="submit" disabled={busy} className="h-7 px-2 rounded-md bg-white/[0.08] hover:bg-white/[0.12] text-white text-[11px] disabled:opacity-40">
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
          <span className="truncate max-w-[220px]">{memo || "메모 추가"}</span>
        </button>
      )}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
