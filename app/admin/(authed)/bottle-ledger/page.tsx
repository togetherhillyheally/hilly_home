import { Search } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";
import BottleOddsEditor from "./BottleOddsEditor";
import { DEFAULT_BOTTLE_ODDS, type BottleOdds } from "./bottleOdds";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const REASON_LABELS: Record<string, string> = {
  puzzle_complete: "퍼즐 완성",
  treasure_box_draw: "보물상자 뽑기",
  admin_adjust: "관리자 조정",
  admin_grant: "관리자 지급",
  legacy_unknown: "이전 이력",
};

function reasonLabel(code: string | null): string | null {
  if (!code) return null;
  return REASON_LABELS[code] ?? code;
}

type LedgerRow = {
  id: string;
  user_id: string;
  delta: number;
  reason: string | null;
  ref_id: string | null;
  balance_after: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ProfileMini = { id: string; nickname: string | null };

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BottleLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
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
    select: "id,user_id,delta,reason,ref_id,balance_after,metadata,created_at",
    currency: "eq.bottle",
    order: "created_at.desc",
  });
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

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { rows: users } = await (userIds.length > 0
    ? adminList<ProfileMini>(
        `profiles?select=id,nickname&id=in.(${userIds.join(",")})`
      )
    : Promise.resolve({ rows: [] as ProfileMini[], total: 0 }));
  const userMap = new Map(users.map((u) => [u.id, u.nickname]));

  // 뽑기 확률 — DB 원천, 실패/미시드 시 기본값 폴백
  const { rows: oddsRows } = await adminList<{ mult: number; weight: number }>(
    "treasure_box_odds?select=mult,weight&order=mult.asc"
  );
  const odds: BottleOdds =
    oddsRows.length === 5
      ? oddsRows.map((r) => ({ mult: r.mult, weight: r.weight }))
      : DEFAULT_BOTTLE_ODDS;

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          물병 원장
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          물(bottle) · 총 {total.toLocaleString()}건
        </p>
      </header>

      <BottleOddsEditor odds={odds} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          action="/admin/bottle-ledger"
          method="get"
          className="flex gap-2 flex-1 max-w-md min-w-[240px]"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              name="q"
              type="text"
              placeholder="닉네임 / 휴대폰 / user_id"
              defaultValue={q}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-sky-500/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm"
          >
            검색
          </button>
        </form>
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
            <table className="w-full text-sm min-w-[880px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">시각</th>
                  <th className="text-left px-4 py-3 font-medium">유저</th>
                  <th className="text-left px-4 py-3 font-medium">사유</th>
                  <th className="text-left px-4 py-3 font-medium">상세</th>
                  <th className="text-right px-4 py-3 font-medium">변동</th>
                  <th className="text-right px-4 py-3 font-medium">잔액</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const positive = r.delta >= 0;
                  const meta = r.metadata as
                    | { bet?: number; mult?: number; win?: number; tier?: number }
                    | null;
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
                      <td className="px-4 py-3 text-xs text-gray-300">
                        {r.reason ? (
                          reasonLabel(r.reason)
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {r.reason === "treasure_box_draw" && meta ? (
                          <span>
                            {meta.bet}개 배팅 → x{meta.mult}
                          </span>
                        ) : r.reason === "puzzle_complete" && meta?.tier ? (
                          <span>티어 {meta.tier}</span>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        basePath="/admin/bottle-ledger"
        page={page}
        totalPages={totalPages}
        query={{ q: q || undefined }}
      />
    </main>
  );
}
