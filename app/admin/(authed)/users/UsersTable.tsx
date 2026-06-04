"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";

export type RoleField =
  | "is_super_admin"
  | "is_puzzle_admin"
  | "is_host_verified"
  | "is_tester";

export type UserRow = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  email: string | null;
  region: string | null;
  created_at: string;
  is_super_admin: boolean | null;
  is_puzzle_admin: boolean | null;
  is_host_verified: boolean | null;
  is_tester: boolean | null;
};

const FIELDS: { key: RoleField; label: string }[] = [
  { key: "is_super_admin", label: "슈퍼" },
  { key: "is_puzzle_admin", label: "퍼즐" },
  { key: "is_host_verified", label: "호스트" },
  { key: "is_tester", label: "테스터" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RoleToggle({
  value,
  disabled,
  pending,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  pending?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={`relative inline-flex items-center gap-1 cursor-pointer ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      }`}
    >
      <input
        type="checkbox"
        className="sr-only peer"
        checked={value}
        disabled={disabled || pending}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="w-8 h-[18px] rounded-full bg-white/10 peer-checked:bg-orange-500/80 transition-colors relative">
        <span
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
            value ? "translate-x-[14px]" : ""
          }`}
        />
      </span>
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
      ) : null}
    </label>
  );
}

export default function UsersTable({
  rows,
  currentUserId,
}: {
  rows: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = async (
    user: UserRow,
    field: RoleField,
    next: boolean
  ) => {
    const key = `${user.id}:${field}`;
    setPendingKey(key);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(data.error ?? "변경 실패");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      alert("네트워크 오류");
    } finally {
      setPendingKey(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
        결과가 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-white/[0.03] text-gray-400 text-xs">
            <tr>
              <th className="text-left px-4 py-3 font-medium">유저</th>
              <th className="text-left px-4 py-3 font-medium">휴대폰</th>
              <th className="text-left px-4 py-3 font-medium">이메일</th>
              <th className="text-left px-4 py-3 font-medium">가입일</th>
              {FIELDS.map((f) => (
                <th
                  key={f.key}
                  className="text-center px-2 py-3 font-medium whitespace-nowrap"
                >
                  {f.label}
                </th>
              ))}
              <th className="text-right px-3 py-3 font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const isSelf = p.id === currentUserId;
              return (
                <tr
                  key={p.id}
                  className="border-t border-white/5 hover:bg-white/[0.04] group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-xs text-gray-400 overflow-hidden flex-shrink-0">
                        {p.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (p.nickname ?? "?").slice(0, 1)
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/users/${p.id}`}
                          className="text-white truncate hover:text-orange-300 transition-colors"
                        >
                          {p.nickname ?? (
                            <span className="text-gray-600">(없음)</span>
                          )}
                          {isSelf ? (
                            <span className="ml-1 text-[10px] text-orange-300">
                              본인
                            </span>
                          ) : null}
                        </Link>
                        <code className="block text-[10px] text-gray-500">
                          {p.id.slice(0, 8)}…
                        </code>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-300 text-xs">
                    {p.phone_number ?? (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">
                    {p.email ? (
                      <span className="truncate inline-block max-w-[180px] align-bottom">
                        {p.email}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {formatDate(p.created_at)}
                  </td>
                  {FIELDS.map((f) => {
                    const value = Boolean(p[f.key]);
                    const lockSuper =
                      isSelf && f.key === "is_super_admin" && value;
                    const key = `${p.id}:${f.key}`;
                    return (
                      <td key={f.key} className="px-2 py-3 text-center">
                        <RoleToggle
                          value={value}
                          disabled={lockSuper}
                          pending={pendingKey === key}
                          onChange={(next) => toggle(p, f.key, next)}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/admin/users/${p.id}`}
                      className="inline-flex text-gray-600 group-hover:text-white transition-colors"
                      aria-label="상세 보기"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
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
