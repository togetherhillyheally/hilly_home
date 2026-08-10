"use client";

import Link from "next/link";
import { ChevronRight, Sprout } from "lucide-react";
import RoleBadge from "../RoleBadge";
import type { AdminTier } from "@/lib/admin-permissions";

export type UserRow = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  email: string | null;
  region: string | null;
  created_at: string;
  admin_tier: AdminTier | null;
};

const TIER_COLOR: Record<AdminTier | "user", "red" | "violet" | "gray"> = {
  master: "red",
  admin: "violet",
  manager: "violet",
  client: "gray",
  user: "gray",
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

export default function UsersTable({
  rows,
  currentUserId,
  seedByUser,
}: {
  rows: UserRow[];
  currentUserId: string;
  seedByUser: Record<string, { generic: number; brand: number }>;
}) {
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
        <table className="w-full text-sm min-w-[880px]">
          <thead className="bg-white/[0.03] text-gray-400 text-xs">
            <tr>
              <th className="text-left px-4 py-3 font-medium">유저</th>
              <th className="text-left px-4 py-3 font-medium">휴대폰</th>
              <th className="text-left px-4 py-3 font-medium">이메일</th>
              <th className="text-left px-4 py-3 font-medium">가입일</th>
              <th className="text-right px-3 py-3 font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-1">
                  <Sprout className="h-3 w-3 text-emerald-300" />
                  씨앗
                </span>
              </th>
              <th className="text-center px-3 py-3 font-medium whitespace-nowrap">
                권한
              </th>
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
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {(() => {
                      const s = seedByUser[p.id];
                      const gen = s?.generic ?? 0;
                      const brand = s?.brand ?? 0;
                      return (
                        <>
                          <span
                            className={`font-mono text-sm ${gen > 0 ? "text-emerald-200" : "text-gray-600"}`}
                          >
                            {gen.toLocaleString()}
                          </span>
                          {brand > 0 ? (
                            <span className="ml-1 font-mono text-[10px] text-violet-300">
                              +{brand.toLocaleString()}
                            </span>
                          ) : null}
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <RoleBadge
                      label={p.admin_tier ?? "user"}
                      color={TIER_COLOR[p.admin_tier ?? "user"]}
                    />
                  </td>
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
