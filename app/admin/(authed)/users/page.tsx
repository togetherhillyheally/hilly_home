import { Search } from "lucide-react";
import { redirect } from "next/navigation";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import { readAdminSession } from "@/lib/admin-session";
import type { AdminTier } from "@/lib/admin-permissions";
import Pagination from "../Pagination";
import UsersTable, { type UserRow } from "./UsersTable";
import TierFilterSelect from "./TierFilterSelect";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type TierFilter = "all" | AdminTier | "user";

const TIER_TABS: TierFilter[] = ["all", "master", "admin", "manager", "client", "user"];

const TIER_LABELS: Record<TierFilter, string> = {
  all: "전체",
  master: "master",
  admin: "admin",
  manager: "manager",
  client: "client",
  user: "user",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; page?: string }>;
}) {
  const session = await readAdminSession();
  if (!session) redirect("/admin");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tier: TierFilter = TIER_TABS.includes(sp.tier as TierFilter)
    ? (sp.tier as TierFilter)
    : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select:
      "id,nickname,avatar_url,phone_number,email,region,created_at,admin_tier",
    order: "created_at.desc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set(
      "or",
      `(nickname.ilike.*${t}*,phone_number.ilike.*${t}*,email.ilike.*${t}*)`
    );
  }
  if (tier === "user") {
    params.set("admin_tier", "is.null");
  } else if (tier !== "all") {
    params.set("admin_tier", `eq.${tier}`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows, total } = await adminList<UserRow>(
    `profiles?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 현재 페이지 유저들의 씨앗 잔액 (일반 + 브랜드 합계)
  const seedMap = new Map<string, { generic: number; brand: number }>();
  if (rows.length > 0) {
    const inList = rows.map((r) => r.id).join(",");
    const [genRes, brandRes] = await Promise.all([
      adminList<{ user_id: string; balance: number }>(
        `garden_seed_balance?select=user_id,balance&user_id=in.(${inList})`
      ),
      adminList<{ user_id: string; pieces: number; trail_id: string | null }>(
        `garden_trail_seed_balance?select=user_id,pieces,trail_id&user_id=in.(${inList})`
      ),
    ]);
    genRes.rows.forEach((g) => {
      const cur = seedMap.get(g.user_id) ?? { generic: 0, brand: 0 };
      cur.generic = g.balance;
      seedMap.set(g.user_id, cur);
    });
    brandRes.rows.forEach((b) => {
      if (!b.trail_id) return;
      const cur = seedMap.get(b.user_id) ?? { generic: 0, brand: 0 };
      cur.brand += b.pieces;
      seedMap.set(b.user_id, cur);
    });
  }
  const seedByUser: Record<string, { generic: number; brand: number }> = {};
  seedMap.forEach((v, k) => (seedByUser[k] = v));

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          유저 목록
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {q ? `"${q}" ` : ""}
          {TIER_LABELS[tier]} · 총 {total.toLocaleString()}명
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          action="/admin/users"
          method="get"
          className="flex gap-2 flex-1 max-w-md min-w-[240px]"
        >
          <input type="hidden" name="tier" value={tier} />
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

        <TierFilterSelect
          q={q}
          selected={tier}
          options={TIER_TABS.map((t) => ({ value: t, label: TIER_LABELS[t] }))}
        />
      </div>

      <UsersTable
        rows={rows}
        currentUserId={session.userId}
        seedByUser={seedByUser}
      />

      <Pagination
        basePath="/admin/users"
        page={page}
        totalPages={totalPages}
        query={{
          q: q || undefined,
          tier: tier !== "all" ? tier : undefined,
        }}
      />
    </main>
  );
}
