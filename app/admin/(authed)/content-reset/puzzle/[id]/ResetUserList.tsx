"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";

export type ProgressRow = {
  user_id: string;
  nickname: string | null;
  phone_number: string | null;
  pieces_found: number;
  cycles: number;
  current_tier: number | null;
  latest_activity_at: string;
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

export default function ResetUserList({
  puzzleId,
  rows,
}: {
  puzzleId: string;
  rows: ProgressRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneAt, setDoneAt] = useState<number | null>(null);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(rows.map((r) => r.user_id)) : new Set());
  };

  const toggleOne = (userId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const reset = async () => {
    if (selected.size === 0) return;
    const names = rows
      .filter((r) => selected.has(r.user_id))
      .map((r) => r.nickname ?? "(닉네임 없음)")
      .join(", ");
    if (
      !window.confirm(
        `선택한 ${selected.size}명의 이 퍼즐에서 "씨앗으로 뽑은 조각"만 초기화할까요?\n\n${names}\n\n지도(보물)로 찾은 조각과 이미 지급된 보상은 그대로 유지돼요. 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/content-reset/puzzle/${puzzleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "초기화 실패");
        return;
      }
      setSelected(new Set());
      setDoneAt(Date.now());
      startTransition(() => router.refresh());
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
        이 퍼즐에서 씨앗으로 뽑은 조각이 있는 유저가 없어요.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
            className="accent-orange-500"
          />
          전체 선택 ({selected.size}/{rows.length})
        </label>
        <div className="flex items-center gap-3">
          {doneAt && selected.size === 0 ? (
            <span className="text-xs text-emerald-400">초기화 완료</span>
          ) : null}
          <button
            type="button"
            onClick={reset}
            disabled={selected.size === 0 || submitting}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white text-sm font-medium"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            선택 초기화 (씨앗 조각만)
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-white/[0.03] text-gray-400 text-xs">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 font-medium">유저</th>
                <th className="text-left px-4 py-3 font-medium">연락처</th>
                <th className="text-center px-3 py-3 font-medium">씨앗 조각</th>
                <th className="text-center px-3 py-3 font-medium">완료 횟수</th>
                <th className="text-center px-3 py-3 font-medium">티어</th>
                <th className="text-left px-4 py-3 font-medium">최근 활동</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.user_id}
                  className="border-t border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.user_id)}
                      onChange={(e) => toggleOne(r.user_id, e.target.checked)}
                      className="accent-orange-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-white">
                    {r.nickname ?? <span className="text-gray-600">(없음)</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-300 text-xs">
                    {r.phone_number ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-gray-300">
                    {r.pieces_found}
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-gray-300">
                    {r.cycles}
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-gray-300">
                    {r.current_tier ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(r.latest_activity_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
