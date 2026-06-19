"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  reporter_nickname: string | null;
  preview: string | null;
  preview_author: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TARGET_LABELS: Record<string, string> = {
  basecamp_guestbook: "캠프 방명록",
  hiking_session_reviews: "모험 후기",
  hiking_session_chat_messages: "모험 채팅",
};

// resolve-with-delete API가 지원하는 target_type 화이트리스트
const DELETABLE_TYPES = new Set([
  "basecamp_guestbook",
  "hiking_session_reviews",
  "hiking_session_chat_messages",
]);

function StatusBadge({ resolved }: { resolved: boolean }) {
  if (resolved) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
        처리완료
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-orange-500/15 text-orange-300 border-orange-500/30">
      대기
    </span>
  );
}

export default function ReportsTable({ rows }: { rows: ReportRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const action = async (
    id: string,
    kind: "resolve" | "reopen" | "resolve-with-delete"
  ) => {
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}/${kind}`, {
        method: "POST",
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
    }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
        해당 조건의 신고가 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-white/[0.03] text-gray-400 text-xs">
            <tr>
              <th className="text-left px-4 py-3 font-medium">상태</th>
              <th className="text-left px-4 py-3 font-medium">대상</th>
              <th className="text-left px-4 py-3 font-medium">콘텐츠</th>
              <th className="text-left px-4 py-3 font-medium">신고 사유</th>
              <th className="text-left px-4 py-3 font-medium">신고자</th>
              <th className="text-left px-4 py-3 font-medium">신고 시각</th>
              <th className="text-right px-4 py-3 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isPending = pendingId === r.id;
              const targetLabel = TARGET_LABELS[r.target_type] ?? r.target_type;
              return (
                <tr
                  key={r.id}
                  className="border-t border-white/5 hover:bg-white/[0.02] align-top"
                >
                  <td className="px-4 py-3">
                    <StatusBadge resolved={r.resolved} />
                    {r.resolved && r.resolved_at ? (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {formatDate(r.resolved_at)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-200 text-xs">{targetLabel}</div>
                    <code className="text-[10px] text-gray-500">
                      {r.target_id.slice(0, 8)}…
                    </code>
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    {r.preview ? (
                      <div className="text-gray-200 text-xs whitespace-pre-wrap line-clamp-3">
                        {r.preview}
                      </div>
                    ) : (
                      <span className="text-gray-600 text-xs">
                        (콘텐츠 없음 / 삭제됨)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300 max-w-[200px]">
                    {r.reason ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="text-gray-200">
                      {r.reporter_nickname ?? (
                        <span className="text-gray-600">(없음)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {r.resolved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => action(r.id, "reopen")}
                          className="border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white h-8"
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              재오픈
                            </>
                          )}
                        </Button>
                      ) : (
                        <>
                          {DELETABLE_TYPES.has(r.target_type) && r.preview ? (
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `이 콘텐츠를 삭제하고 신고를 처리할까요?\n\n${(r.preview ?? "").slice(0, 100)}\n\n복구할 수 없습니다.`
                                  )
                                )
                                  return;
                                action(r.id, "resolve-with-delete");
                              }}
                              className="bg-red-500/90 hover:bg-red-500 text-white h-8"
                            >
                              {isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  삭제 + 처리
                                </>
                              )}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() => action(r.id, "resolve")}
                            className="bg-emerald-500/90 hover:bg-emerald-500 text-white h-8"
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1" />
                                처리
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
