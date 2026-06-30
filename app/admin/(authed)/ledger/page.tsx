import Link from "next/link";
import { Search } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

type CurrencyFilter = "all" | "seed" | "campfire";

const LABELS: Record<CurrencyFilter, string> = {
  all: "전체",
  seed: "씨앗",
  campfire: "정원 씨앗",
};

type LedgerRow = {
  id: string;
  user_id: string;
  currency: string;
  trail_id: string | null;
  delta: number;
  reason: string | null;
  ref_id: string | null;
  balance_after: number | null;
  created_at: string;
};

type ProfileMini = { id: string; nickname: string | null };
type TrailMini = { id: string; name: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildHref(s: {
  q?: string;
  currency?: CurrencyFilter;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (s.q) sp.set("q", s.q);
  if (s.currency && s.currency !== "all") sp.set("currency", s.currency);
  if (s.page && s.page > 1) sp.set("page", String(s.page));
  const qs = sp.toString();
  return qs ? `/admin/ledger?${qs}` : "/admin/ledger";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; currency?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const currency = (
    ["seed", "campfire"].includes(sp.currency ?? "")
      ? sp.currency
      : "all"
  ) as CurrencyFilter;
  const page = Math.max(1, Number(sp.page) || 1);

  // 검색: UUID면 user_id 직접, 아니면 닉네임/번호로 profiles 검색 후 in.()
  let userIdsFilter: string[] | null = null;
  let searchInvalid = false;
  if (q) {
    if (UUID_RE.test(q)) {
      userIdsFilter = [q];
    } else {
      const t = escapeIlike(q);
      const { rows: matched } = await adminList<{ id: string }>(
        `profiles?select=id&or=(nickname.ilike.*${t}*,phone_number.ilike.*${t}*)`,
        { from: 0, to: 199 }
      );
      userIdsFilter = matched.map((r) => r.id);
      if (userIdsFilter.length === 0) searchInvalid = true;
    }
  }

  const params = new URLSearchParams({
    select:
      "id,user_id,currency,trail_id,delta,reason,ref_id,balance_after,created_at",
    order: "created_at.desc",
  });
  if (currency !== "all") params.set("currency", `eq.${currency}`);
  if (userIdsFilter) {
    params.set("user_id", `in.(${userIdsFilter.join(",")})`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows, total } = searchInvalid
    ? { rows: [] as LedgerRow[], total: 0 }
    : await adminList<LedgerRow>(`currency_ledger?${params.toString()}`, {
        from,
        to,
        count: true,
      });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 닉네임/트레일 일괄 매핑
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const trailIds = Array.from(
    new Set(rows.map((r) => r.trail_id).filter(Boolean) as string[])
  );

  const [{ rows: users }, { rows: trails }] = await Promise.all([
    userIds.length > 0
      ? adminList<ProfileMini>(
          `profiles?select=id,nickname&id=in.(${userIds.join(",")})`
        )
      : Promise.resolve({ rows: [] as ProfileMini[], total: 0 }),
    trailIds.length > 0
      ? adminList<TrailMini>(
          `trails?select=id,name&id=in.(${trailIds.join(",")})`
        )
      : Promise.resolve({ rows: [] as TrailMini[], total: 0 }),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u.nickname]));
  const trailMap = new Map(trails.map((t) => [t.id, t.name]));

  const tabs: CurrencyFilter[] = ["all", "seed", "campfire"];

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          씨앗 원장
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {LABELS[currency]} · 총 {total.toLocaleString()}건
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          action="/admin/ledger"
          method="get"
          className="flex gap-2 flex-1 max-w-md min-w-[240px]"
        >
          <input type="hidden" name="currency" value={currency} />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              name="q"
              type="text"
              placeholder="닉네임 / 휴대폰 / user_id"
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
            const active = currency === t;
            return (
              <Link
                key={t}
                href={buildHref({ q: q || undefined, currency: t })}
                className={`px-3 h-8 inline-flex items-center rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
                    : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                }`}
              >
                {LABELS[t]}
              </Link>
            );
          })}
        </div>
      </div>

      {searchInvalid ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          일치하는 유저가 없습니다. ({q})
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          내역이 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[920px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">시각</th>
                  <th className="text-left px-4 py-3 font-medium">유저</th>
                  <th className="text-left px-3 py-3 font-medium">통화</th>
                  <th className="text-left px-4 py-3 font-medium">트레일</th>
                  <th className="text-right px-4 py-3 font-medium">변동</th>
                  <th className="text-right px-4 py-3 font-medium">잔액</th>
                  <th className="text-left px-4 py-3 font-medium">사유</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const positive = r.delta >= 0;
                  return (
                    <tr
                      key={r.id}
                      className="border-t border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-[11px] font-mono text-gray-400 whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-gray-200">
                          {userMap.get(r.user_id) ?? (
                            <span className="text-gray-600">(없음)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md font-medium border ${
                            r.currency === "campfire"
                              ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {r.currency === "campfire"
                            ? "정원 씨앗"
                            : r.currency === "seed"
                              ? r.trail_id
                                ? "브랜드 씨앗"
                                : "씨앗"
                              : r.currency}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.trail_id ? (
                          <div className="text-gray-300 truncate max-w-[160px]">
                            {trailMap.get(r.trail_id) ?? (
                              <code className="text-gray-500">
                                {r.trail_id.slice(0, 8)}…
                              </code>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono text-sm whitespace-nowrap ${
                          positive ? "text-emerald-300" : "text-red-300"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {r.delta.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-400 whitespace-nowrap">
                        {r.balance_after != null
                          ? r.balance_after.toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300 max-w-[260px]">
                        {r.reason ? (
                          <span className="truncate inline-block max-w-full align-bottom">
                            {r.reason}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        basePath="/admin/ledger"
        page={page}
        totalPages={totalPages}
        query={{
          q: q || undefined,
          currency: currency !== "all" ? currency : undefined,
        }}
      />
    </main>
  );
}
