import Link from "next/link";
import { Search } from "lucide-react";
import { redirect } from "next/navigation";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import { readAdminSession } from "@/lib/admin-session";
import Pagination from "../Pagination";
import UsersTable, { type UserRow } from "./UsersTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type RoleFilter = "all" | "super" | "puzzle" | "host" | "tester";

const FILTER_FIELDS: Record<Exclude<RoleFilter, "all">, string> = {
  super: "is_super_admin",
  puzzle: "is_puzzle_admin",
  host: "is_host_verified",
  tester: "is_tester",
};

const FILTER_LABELS: Record<RoleFilter, string> = {
  all: "전체",
  super: "슈퍼",
  puzzle: "퍼즐",
  host: "호스트",
  tester: "테스터",
};

function buildHref(s: {
  q?: string;
  role?: RoleFilter;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (s.q) sp.set("q", s.q);
  if (s.role && s.role !== "all") sp.set("role", s.role);
  if (s.page && s.page > 1) sp.set("page", String(s.page));
  const qs = sp.toString();
  return qs ? `/admin/users?${qs}` : "/admin/users";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const session = await readAdminSession();
  if (!session) redirect("/admin");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const role = (
    ["super", "puzzle", "host", "tester"].includes(sp.role ?? "")
      ? sp.role
      : "all"
  ) as RoleFilter;
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select:
      "id,nickname,avatar_url,phone_number,email,region,created_at,is_super_admin,is_puzzle_admin,is_host_verified,is_tester",
    order: "created_at.desc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set(
      "or",
      `(nickname.ilike.*${t}*,phone_number.ilike.*${t}*,email.ilike.*${t}*)`
    );
  }
  if (role !== "all") {
    params.set(FILTER_FIELDS[role], "eq.true");
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows, total } = await adminList<UserRow>(
    `profiles?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabs: RoleFilter[] = ["all", "super", "puzzle", "host", "tester"];

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          유저 목록
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {q ? `"${q}" ` : ""}
          {FILTER_LABELS[role]} · 총 {total.toLocaleString()}명
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          action="/admin/users"
          method="get"
          className="flex gap-2 flex-1 max-w-md min-w-[240px]"
        >
          <input type="hidden" name="role" value={role} />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              name="q"
              type="text"
              placeholder="닉네임 / 휴대폰 / 이메일"
              defaultValue={q}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm"
          >
            검색
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => {
            const active = role === t;
            return (
              <Link
                key={t}
                href={buildHref({ q: q || undefined, role: t })}
                className={`px-3 h-8 inline-flex items-center rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
                    : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                }`}
              >
                {FILTER_LABELS[t]}
              </Link>
            );
          })}
        </div>
      </div>

      <UsersTable rows={rows} currentUserId={session.userId} />

      <Pagination
        basePath="/admin/users"
        page={page}
        totalPages={totalPages}
        query={{
          q: q || undefined,
          role: role !== "all" ? role : undefined,
        }}
      />
    </main>
  );
}
