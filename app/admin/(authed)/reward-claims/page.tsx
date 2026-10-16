import Link from "next/link";
import { Gift, Search } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";
import ClaimStatusCell from "./ClaimStatusCell";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type StatusFilter = "all" | "requested" | "fulfilled" | "cancelled";
type MethodFilter = "all" | "onsite" | "delivery";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "전체",
  requested: "미지급",
  fulfilled: "지급 완료",
  cancelled: "취소",
};
const METHOD_LABELS: Record<MethodFilter, string> = {
  all: "전체",
  onsite: "현장",
  delivery: "배송",
};

type ClaimRow = {
  id: string;
  code: string;
  method: "onsite" | "delivery";
  status: "requested" | "fulfilled" | "cancelled";
  recipient_name: string | null;
  phone: string | null;
  postal_code: string | null;
  address1: string | null;
  address2: string | null;
  request_note: string | null;
  created_at: string;
  fulfilled_at: string | null;
  fulfill_note: string | null;
  puzzles: { id: string; name: string; reward_description: string | null } | null;
  claimer: { id: string; nickname: string | null; phone_number: string | null } | null;
};

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildHref(s: { q?: string; status?: StatusFilter; method?: MethodFilter; page?: number }): string {
  const sp = new URLSearchParams();
  if (s.q) sp.set("q", s.q);
  if (s.status && s.status !== "requested") sp.set("status", s.status);
  if (s.method && s.method !== "all") sp.set("method", s.method);
  if (s.page && s.page > 1) sp.set("page", String(s.page));
  const qs = sp.toString();
  return qs ? `/admin/reward-claims?${qs}` : "/admin/reward-claims";
}

export default async function RewardClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; method?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (["all", "fulfilled", "cancelled", "requested"].includes(sp.status ?? "")
    ? sp.status
    : "requested") as StatusFilter;
  const method = (["onsite", "delivery", "all"].includes(sp.method ?? "") ? sp.method : "all") as MethodFilter;
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select:
      "id,code,method,status,recipient_name,phone,postal_code,address1,address2,request_note,created_at,fulfilled_at,fulfill_note," +
      "puzzles(id,name,reward_description),claimer:profiles!user_id!inner(id,nickname,phone_number)",
    order: "created_at.desc",
  });
  if (status !== "all") params.set("status", `eq.${status}`);
  if (method !== "all") params.set("method", `eq.${method}`);
  if (q) {
    const t = escapeIlike(q);
    // 코드는 본체 컬럼, 닉네임/전화는 임베드 — 둘 다 or 로는 못 묶여서 코드 형식이면 코드로, 아니면 신청자로
    if (/^HL-?[A-Z0-9]{2,}$/i.test(q)) {
      params.set("code", `ilike.*${t.replace(/^HL-?/i, "")}*`);
    } else {
      params.set("claimer.or", `(nickname.ilike.*${t}*,phone_number.ilike.*${t}*)`);
    }
  }
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { rows, total } = await adminList<ClaimRow>(`puzzle_reward_claims?${params.toString()}`, {
    from,
    to,
    count: true,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statuses: StatusFilter[] = ["requested", "fulfilled", "cancelled", "all"];
  const methods: MethodFilter[] = ["all", "onsite", "delivery"];

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight inline-flex items-center gap-2">
          <Gift className="h-6 w-6 text-pink-300" />
          완주 리워드 신청
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {STATUS_LABELS[status]} {total.toLocaleString()}건 · 메타 퍼즐(9구간 등) 완성 후 신청된 리워드예요. 현장은
          관리자 앱에서 코드로도 처리돼요.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form action="/admin/reward-claims" method="get" className="flex gap-2 flex-1 max-w-md min-w-[240px]">
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="method" value={method} />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              name="q"
              type="text"
              placeholder="코드(HL-…) / 닉네임 / 전화번호"
              defaultValue={q}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button type="submit" className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm">
            검색
          </button>
        </form>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex flex-wrap gap-1.5">
          <span className="text-gray-500 self-center mr-1">상태</span>
          {statuses.map((s) => (
            <Link
              key={s}
              href={buildHref({ q: q || undefined, status: s, method })}
              className={`px-3 h-7 inline-flex items-center rounded-md font-medium transition-colors ${
                status === s
                  ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
                  : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
              }`}
            >
              {STATUS_LABELS[s]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-gray-500 self-center mr-1">수령</span>
          {methods.map((m) => (
            <Link
              key={m}
              href={buildHref({ q: q || undefined, status, method: m })}
              className={`px-3 h-7 inline-flex items-center rounded-md font-medium transition-colors ${
                method === m
                  ? "bg-pink-500/15 text-pink-200 border border-pink-500/40"
                  : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
              }`}
            >
              {METHOD_LABELS[m]}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          조건에 맞는 신청이 없어요.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">신청 시각</th>
                  <th className="text-left px-4 py-3 font-medium">코드</th>
                  <th className="text-left px-4 py-3 font-medium">신청자</th>
                  <th className="text-left px-4 py-3 font-medium">퍼즐 · 리워드</th>
                  <th className="text-left px-4 py-3 font-medium">수령</th>
                  <th className="text-left px-4 py-3 font-medium">처리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02] align-top">
                    <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-white whitespace-nowrap">{r.code}</td>
                    <td className="px-4 py-3">
                      {r.claimer ? (
                        <Link href={`/admin/users/${r.claimer.id}`} className="block hover:text-amber-300 transition-colors">
                          <span className="text-white">{r.claimer.nickname ?? "(닉네임 없음)"}</span>
                          {r.claimer.phone_number && (
                            <span className="block text-[11px] text-gray-500 tabular-nums">{r.claimer.phone_number}</span>
                          )}
                        </Link>
                      ) : (
                        <span className="text-gray-600">탈퇴 회원</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.puzzles ? (
                        <Link href={`/admin/puzzles/${r.puzzles.id}`} className="text-white hover:text-amber-300 transition-colors">
                          {r.puzzles.name}
                        </Link>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                      {r.puzzles?.reward_description && (
                        <span className="block text-[11px] text-gray-500 max-w-[260px] truncate">{r.puzzles.reward_description}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {r.method === "onsite" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-gray-200">
                          현장
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-pink-500/40 bg-pink-500/10 text-[10px] font-semibold text-pink-200">
                            배송
                          </span>
                          <div className="text-white">
                            {r.recipient_name} · {r.phone}
                          </div>
                          <div className="text-gray-400 max-w-[280px]">
                            {r.postal_code ? `(${r.postal_code}) ` : ""}
                            {r.address1} {r.address2 ?? ""}
                          </div>
                        </div>
                      )}
                      {r.request_note && <div className="text-[11px] text-gray-500 mt-1">“{r.request_note}”</div>}
                    </td>
                    <td className="px-4 py-3">
                      <ClaimStatusCell claimId={r.id} status={r.status} fulfilledAt={r.fulfilled_at} note={r.fulfill_note} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        basePath="/admin/reward-claims"
        page={page}
        totalPages={totalPages}
        query={{
          q: q || undefined,
          status: status !== "requested" ? status : undefined,
          method: method !== "all" ? method : undefined,
        }}
      />
    </main>
  );
}
