"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GuestbookRow = {
  id: string;
  owner_user_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
  owner_nickname: string | null;
  author_nickname: string | null;
  reportCount: number;
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

export default function GuestbookTable({ rows }: { rows: GuestbookRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const remove = async (row: GuestbookRow) => {
    if (
      !window.confirm(
        `이 방명록 메시지를 삭제할까요?\n\n작성자: ${row.author_nickname ?? row.author_user_id.slice(0, 8) + "…"}\n내용: ${row.content.slice(0, 80)}`
      )
    )
      return;
    setPendingId(row.id);
    try {
      const res = await fetch(`/api/admin/guestbook/${row.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(data.error ?? "삭제 실패");
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
        메시지가 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[840px]">
          <thead className="bg-white/[0.03] text-gray-400 text-xs">
            <tr>
              <th className="text-left px-4 py-3 font-medium">작성자</th>
              <th className="text-left px-4 py-3 font-medium">캠프 주인</th>
              <th className="text-left px-4 py-3 font-medium">내용</th>
              <th className="text-left px-4 py-3 font-medium">신고</th>
              <th className="text-left px-4 py-3 font-medium">작성 시각</th>
              <th className="text-right px-4 py-3 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isPending = pendingId === r.id;
              return (
                <tr
                  key={r.id}
                  className={`border-t border-white/5 hover:bg-white/[0.02] align-top ${
                    r.reportCount > 0 ? "bg-red-500/[0.03]" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-xs">
                    <div className="text-gray-200">
                      {r.author_nickname ?? (
                        <span className="text-gray-600">(없음)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="text-gray-300">
                      {r.owner_nickname ?? (
                        <span className="text-gray-600">(없음)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[320px]">
                    <div className="text-gray-200 text-xs whitespace-pre-wrap line-clamp-3">
                      {r.content}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.reportCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border bg-red-500/15 text-red-300 border-red-500/30">
                        <Flag className="h-3 w-3" />
                        {r.reportCount}건
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => remove(r)}
                        className="border-red-500/30 bg-red-500/5 text-red-300 hover:bg-red-500/15 hover:text-red-200 h-8"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            삭제
                          </>
                        )}
                      </Button>
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
