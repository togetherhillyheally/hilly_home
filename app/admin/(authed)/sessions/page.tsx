import Link from "next/link";
import { ChevronRight, Lock, Search, User } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type StatusFilter = "all" | "open" | "completed" | "cancelled";

const STATUS_META: Record<
  Exclude<StatusFilter, "all">,
  { label: string; color: string }
> = {
  open: {
    label: "모집중",
    color: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  },
  completed: {
    label: "완료",
    color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  cancelled: {
    label: "취소",
    color: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
};

const TAB_LABELS: Record<StatusFilter, string> = {
  all: "전체",
  open: "모집중",
  completed: "완료",
  cancelled: "취소",
};

type Session = {
  id: string;
  host_id: string;
  title: string;
  mountain_name: string;
  meeting_at: string;
  meeting_place: string;
  capacity: number;
  status: string;
  created_at: string;
  started_at: string | null;
  cover_image_url: string | null;
  is_solo: boolean;
  is_private: boolean;
  auto_approve: boolean;
  invite_code: string | null;
  duration_minutes: number;
};

type ProfileMini = { id: string; nickname: string | null };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildHref(s: {
  q?: string;
  status?: StatusFilter;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (s.q) sp.set("q", s.q);
  if (s.status && s.status !== "all") sp.set("status", s.status);
  if (s.page && s.page > 1) sp.set("page", String(s.page));
  const qs = sp.toString();
  return qs ? `/admin/sessions?${qs}` : "/admin/sessions";
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as keyof typeof STATUS_META];
  const color =
    meta?.color ?? "bg-white/[0.04] text-gray-400 border-white/10";
  const label = meta?.label ?? status;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${color}`}
    >
      {label}
    </span>
  );
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (
    ["open", "completed", "cancelled"].includes(sp.status ?? "")
      ? sp.status
      : "all"
  ) as StatusFilter;
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select:
      "id,host_id,title,mountain_name,meeting_at,meeting_place,capacity,status,created_at,started_at,cover_image_url,is_solo,is_private,auto_approve,invite_code,duration_minutes",
    order: "meeting_at.desc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set(
      "or",
      `(title.ilike.*${t}*,mountain_name.ilike.*${t}*,meeting_place.ilike.*${t}*)`
    );
  }
  if (status !== "all") {
    params.set("status", `eq.${status}`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows, total } = await adminList<Session>(
    `hiking_sessions?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 호스트 닉네임 매핑
  const hostIds = Array.from(new Set(rows.map((r) => r.host_id)));
  const hostMap = new Map<string, string | null>();
  if (hostIds.length > 0) {
    const { rows: hosts } = await adminList<ProfileMini>(
      `profiles?select=id,nickname&id=in.(${hostIds.join(",")})`
    );
    hosts.forEach((p) => hostMap.set(p.id, p.nickname));
  }

  const tabs: StatusFilter[] = ["all", "open", "completed", "cancelled"];

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          모험 (세션)
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {TAB_LABELS[status]} · 총 {total.toLocaleString()}건
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          action="/admin/sessions"
          method="get"
          className="flex gap-2 flex-1 max-w-md min-w-[240px]"
        >
          <input type="hidden" name="status" value={status} />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              name="q"
              type="text"
              placeholder="제목 / 산이름 / 장소"
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
            const active = status === t;
            return (
              <Link
                key={t}
                href={buildHref({ q: q || undefined, status: t })}
                className={`px-3 h-8 inline-flex items-center rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
                    : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                }`}
              >
                {TAB_LABELS[t]}
              </Link>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          결과가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[920px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">모험</th>
                  <th className="text-left px-4 py-3 font-medium">호스트</th>
                  <th className="text-left px-4 py-3 font-medium">미팅</th>
                  <th className="text-center px-3 py-3 font-medium">정원</th>
                  <th className="text-left px-4 py-3 font-medium">상태</th>
                  <th className="text-left px-4 py-3 font-medium">플래그</th>
                  <th className="text-right px-3 py-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-white/5 hover:bg-white/[0.04] group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-white/[0.04] flex items-center justify-center text-xs text-gray-500 overflow-hidden flex-shrink-0">
                          {s.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.cover_image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/sessions/${s.id}`}
                            className="text-white truncate max-w-[260px] block hover:text-orange-300 transition-colors"
                          >
                            {s.title}
                          </Link>
                          <div className="text-[11px] text-gray-500 truncate max-w-[260px]">
                            {s.mountain_name} · {s.meeting_place}
                          </div>
                          <code className="text-[10px] text-gray-600">
                            {s.id.slice(0, 8)}…
                          </code>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-200">
                        <User className="h-3 w-3 text-gray-500" />
                        {hostMap.get(s.host_id) ?? (
                          <span className="text-gray-600">(없음)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">
                      <div>{formatDate(s.meeting_at)}</div>
                      <div className="text-[10px] text-gray-500">
                        {s.duration_minutes}분 예정
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-gray-300">
                      {s.capacity}명
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                      {s.started_at ? (
                        <div className="text-[10px] text-gray-500 mt-1">
                          시작 {formatDate(s.started_at)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.is_solo ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-violet-500/15 text-violet-300 border-violet-500/30">
                            솔로
                          </span>
                        ) : null}
                        {s.is_private ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-gray-500/15 text-gray-300 border-gray-500/30">
                            <Lock className="h-2.5 w-2.5" />
                            비공개
                          </span>
                        ) : null}
                        {s.auto_approve ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                            자동승인
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/admin/sessions/${s.id}`}
                        className="inline-flex text-gray-600 group-hover:text-white transition-colors"
                        aria-label="상세 보기"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        basePath="/admin/sessions"
        page={page}
        totalPages={totalPages}
        query={{
          q: q || undefined,
          status: status !== "all" ? status : undefined,
        }}
      />
    </main>
  );
}
