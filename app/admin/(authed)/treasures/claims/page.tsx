import Link from "next/link";
import { ArrowLeft, Download, Gem, Gift, Search, Sprout } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import Pagination from "../../Pagination";
import FulfillCell from "./FulfillCell";
import {
  buildClaimsParams,
  claimsQueryString,
  formatKst,
  parseClaimFilters,
  KIND_LABELS,
  STATUS_LABELS,
  type ClaimKind,
  type ClaimRow,
  type FulfillStatus,
} from "@/lib/treasure-claims";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type TrailOption = { id: string; name: string };

function KindBadge({ kind }: { kind: ClaimRow["reward_kind"] }) {
  if (kind === "prize") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold bg-pink-500/10 border-pink-500/40 text-pink-200">
        <Gift className="h-3 w-3" />
        경품
      </span>
    );
  }
  if (kind === "seed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold bg-emerald-500/10 border-emerald-500/40 text-emerald-200">
        <Sprout className="h-3 w-3" />
        씨앗
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold bg-white/[0.05] border-white/10 text-gray-400">
      꽝
    </span>
  );
}

export default async function TreasureClaimsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseClaimFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);

  const params = buildClaimsParams(filters);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ rows, total }, { rows: trails }] = await Promise.all([
    adminList<ClaimRow>(`session_treasures?${params.toString()}`, {
      from,
      to,
      count: true,
    }),
    adminList<TrailOption>(
      `trails?select=id,name&map_type=eq.treasure&order=sort_order.asc,created_at.desc`,
      { from: 0, to: 499 }
    ),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const kinds: ClaimKind[] = ["prize", "seed", "none", "all"];
  const statuses: FulfillStatus[] = ["all", "pending", "done"];
  const exportHref = `/api/admin/treasures/claims/export?${claimsQueryString(filters)}`;
  const hrefWith = (patch: Partial<typeof filters>) =>
    `/admin/treasures/claims?${claimsQueryString({ ...filters, ...patch })}`;

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/treasures"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            보물 지도
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight inline-flex items-center gap-2">
            <Gem className="h-6 w-6" style={{ color: "#F2B705" }} />
            보물 획득자 명단
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {KIND_LABELS[filters.kind]} {total.toLocaleString()}건 · 경품은 라벨만 기록돼요.
            수령은 이 명단으로 운영이 처리해요.
          </p>
        </div>
        <a
          href={exportHref}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg text-white text-sm font-medium transition-colors bg-white/[0.06] hover:bg-white/[0.1] border border-white/10"
        >
          <Download className="h-4 w-4" />
          CSV 내려받기
        </a>
      </header>

      <form
        action="/admin/treasures/claims"
        method="get"
        className="mb-4 flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="kind" value={filters.kind} />
        <input type="hidden" name="status" value={filters.status} />
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          획득자
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              name="q"
              type="text"
              placeholder="닉네임 / 전화번호"
              defaultValue={filters.q}
              className="w-56 h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          보물 지도
          <select
            name="trail"
            defaultValue={filters.trail}
            className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 max-w-[260px]"
          >
            <option value="">전체</option>
            {trails.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          시작일
          <input
            name="from"
            type="date"
            defaultValue={filters.from}
            className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          종료일
          <input
            name="to"
            type="date"
            defaultValue={filters.to}
            className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
          />
        </label>
        <button
          type="submit"
          className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm"
        >
          조회
        </button>
        {(filters.q || filters.trail || filters.from || filters.to) && (
          <Link
            href={hrefWith({ q: "", trail: "", from: "", to: "" })}
            className="h-10 inline-flex items-center px-3 text-xs text-gray-400 hover:text-white"
          >
            초기화
          </Link>
        )}
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-gray-500 mr-1">보상</span>
        {kinds.map((k) => {
          const isActive = filters.kind === k;
          return (
            <Link
              key={k}
              href={hrefWith({ kind: k, status: k === "prize" ? filters.status : "all" })}
              className={`px-3 h-7 inline-flex items-center rounded-md font-medium transition-colors ${
                isActive
                  ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
                  : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
              }`}
            >
              {KIND_LABELS[k]}
            </Link>
          );
        })}
        {filters.kind === "prize" && (
          <>
            <span className="text-gray-500 ml-4 mr-1">수령</span>
            {statuses.map((st) => {
              const isActive = filters.status === st;
              return (
                <Link
                  key={st}
                  href={hrefWith({ status: st })}
                  className={`px-3 h-7 inline-flex items-center rounded-md font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40"
                      : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                  }`}
                >
                  {STATUS_LABELS[st]}
                </Link>
              );
            })}
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          조건에 맞는 획득 기록이 없어요.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1160px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">획득 시각</th>
                  <th className="text-left px-4 py-3 font-medium">획득자</th>
                  <th className="text-left px-4 py-3 font-medium">보상</th>
                  <th className="text-right px-3 py-3 font-medium">보물 #</th>
                  <th className="text-left px-4 py-3 font-medium">보물 지도</th>
                  <th className="text-left px-4 py-3 font-medium">세션</th>
                  <th className="text-left px-4 py-3 font-medium">수령</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = r.hiking_sessions;
                  const u = r.claimer;
                  return (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">
                        {formatKst(r.claimed_at)}
                      </td>
                      <td className="px-4 py-3">
                        {u ? (
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="block hover:text-amber-300 transition-colors"
                          >
                            <span className="text-white">{u.nickname ?? "(닉네임 없음)"}</span>
                            {u.phone_number && (
                              <span className="block text-[11px] text-gray-500 tabular-nums">
                                {u.phone_number}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-gray-600">탈퇴 회원</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <KindBadge kind={r.reward_kind} />
                          <span className="text-white text-sm">{r.reward_label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-gray-400 tabular-nums">
                        {r.seq + 1}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300">
                        {s?.trail_id ? (
                          <Link
                            href={`/admin/trails/${s.trail_id}`}
                            className="hover:text-amber-300 transition-colors truncate inline-block max-w-[220px] align-middle"
                          >
                            {s.trails?.name ?? "(이름 없음)"}
                          </Link>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300">
                        <Link
                          href={`/admin/sessions/${r.session_id}`}
                          className="hover:text-amber-300 transition-colors"
                        >
                          <span className="truncate inline-block max-w-[240px] align-middle">
                            {s?.title ?? "(제목 없음)"}
                          </span>
                          <span className="block text-[11px] text-gray-500">
                            {s?.is_solo ? "혼자" : "함께"} · {formatKst(s?.started_at ?? null)}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <FulfillCell
                          treasureId={r.id}
                          isPrize={r.reward_kind === "prize"}
                          fulfilledAt={r.fulfilled_at}
                          note={r.fulfill_note}
                        />
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
        basePath="/admin/treasures/claims"
        page={page}
        totalPages={totalPages}
        query={{
          kind: filters.kind !== "prize" ? filters.kind : undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          q: filters.q || undefined,
          trail: filters.trail || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        }}
      />
    </main>
  );
}
