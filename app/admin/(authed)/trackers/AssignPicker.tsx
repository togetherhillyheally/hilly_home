"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";

type UserHit = {
  id: string;
  nickname: string | null;
  phone_number: string | null;
  email: string | null;
};

/**
 * 기기 배정 대상 고르기 — 닉네임·전화·이메일로 찾아 그 자리에서 배정.
 * 목록 행 안에서 펼쳐 쓰므로 모달 없이 인라인으로 둔다.
 */
export default function AssignPicker({
  onPick,
  onCancel,
  busy,
}: {
  onPick: (userId: string, nickname: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);

  // 입력이 멎은 뒤에만 조회 (타이핑마다 요청하지 않게)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/trackers/users?q=${encodeURIComponent(term)}`
        );
        const j = (await res.json()) as { users?: UserHit[] };
        if (!cancelled) setHits(j.users ?? []);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-3 text-left">
      <div className="flex items-center gap-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="닉네임 · 전화번호 · 이메일 (2자 이상)"
          className="w-full bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none"
        />
        {searching && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
        )}
        <button
          onClick={onCancel}
          className="shrink-0 text-xs text-gray-500 hover:text-gray-300"
        >
          닫기
        </button>
      </div>

      {hits.length > 0 && (
        <ul className="mt-2 max-h-56 divide-y divide-white/5 overflow-y-auto">
          {hits.map((u) => (
            <li key={u.id}>
              <button
                disabled={busy}
                onClick={() => onPick(u.id, u.nickname ?? "이름 없음")}
                className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left hover:bg-white/5 disabled:opacity-50"
              >
                <span className="text-sm text-white">
                  {u.nickname ?? (
                    <span className="text-gray-500">이름 없음</span>
                  )}
                </span>
                <span className="truncate text-xs text-gray-500">
                  {u.phone_number ?? u.email ?? ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !searching && hits.length === 0 && (
        <p className="mt-2 px-1 text-xs text-gray-500">
          검색 결과가 없어요.
        </p>
      )}
    </div>
  );
}
