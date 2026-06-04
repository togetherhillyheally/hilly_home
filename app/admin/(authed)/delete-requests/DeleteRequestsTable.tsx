"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { maskPhone } from "@/lib/phone";

export type DeletionRequest = {
  id: string;
  user_id: string | null;
  phone_number: string;
  phone_e164: string;
  status: "pending" | "processed" | "rejected" | "canceled";
  source: string;
  note: string | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: DeletionRequest["status"] }) {
  const map: Record<DeletionRequest["status"], string> = {
    pending: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    processed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rejected: "bg-gray-500/15 text-gray-300 border-gray-500/30",
    canceled: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  };
  const label: Record<DeletionRequest["status"], string> = {
    pending: "대기",
    processed: "처리완료",
    rejected: "반려",
    canceled: "취소",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}

export default function DeleteRequestsTable({
  requests,
}: {
  requests: DeletionRequest[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [, startTransition] = useTransition();

  const handle = async (
    id: string,
    type: "approve" | "reject",
    note?: string
  ) => {
    setPendingId(id);
    setActionType(type);
    try {
      const res = await fetch(`/api/admin/delete-requests/${id}/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: note ? JSON.stringify({ note }) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(data.error ?? "처리 실패");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      alert("네트워크 오류");
    } finally {
      setPendingId(null);
      setActionType(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
        접수된 삭제 요청이 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-gray-400 text-xs">
          <tr>
            <th className="text-left px-4 py-3 font-medium">상태</th>
            <th className="text-left px-4 py-3 font-medium">휴대폰</th>
            <th className="text-left px-4 py-3 font-medium">user_id</th>
            <th className="text-left px-4 py-3 font-medium">신청 시각</th>
            <th className="text-left px-4 py-3 font-medium">처리 시각</th>
            <th className="text-right px-4 py-3 font-medium">액션</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const isPending = pendingId === r.id;
            const canAct = r.status === "pending";
            return (
              <tr
                key={r.id}
                className="border-t border-white/5 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-gray-200">
                  <div className="font-mono">{maskPhone(r.phone_number)}</div>
                  <div className="text-[11px] text-gray-500">{r.phone_e164}</div>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  <code className="text-[11px] text-gray-500">
                    {r.user_id ? r.user_id.slice(0, 8) + "…" : "(없음)"}
                  </code>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {formatDate(r.requested_at)}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {r.processed_at ? formatDate(r.processed_at) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {canAct ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => {
                            const note = window.prompt(
                              "반려 사유 (선택)"
                            );
                            if (note === null) return;
                            handle(r.id, "reject", note || undefined);
                          }}
                          className="border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white h-8"
                        >
                          {isPending && actionType === "reject" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <X className="h-3.5 w-3.5 mr-1" />반려
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `이 계정을 영구 삭제할까요?\n${maskPhone(
                                  r.phone_number
                                )}\n복구할 수 없습니다.`
                              )
                            )
                              return;
                            handle(r.id, "approve");
                          }}
                          className="bg-red-500/90 hover:bg-red-500 text-white h-8"
                        >
                          {isPending && actionType === "approve" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1" />승인 삭제
                            </>
                          )}
                        </Button>
                      </>
                    ) : r.note ? (
                      <span className="text-[11px] text-gray-500">
                        {r.note}
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
