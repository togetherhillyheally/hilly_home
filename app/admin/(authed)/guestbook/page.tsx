import Link from "next/link";
import { Search } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";
import GuestbookTable, { type GuestbookRow } from "./GuestbookTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type FilterMode = "all" | "reported";
const LABELS: Record<FilterMode, string> = {
  all: "전체",
  reported: "신고됨",
};

type GuestbookMessage = {
  id: string;
  owner_user_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
};

type Report = { target_id: string };
type ProfileMini = { id: string; nickname: string | null };

function buildHref(s: { q?: string; mode?: FilterMode; page?: number }): string {
  const sp = new URLSearchParams();
  if (s.q) sp.set("q", s.q);
  if (s.mode && s.mode !== "all") sp.set("mode", s.mode);
  if (s.page && s.page > 1) sp.set("page", String(s.page));
  const qs = sp.toString();
  return qs ? `/admin/guestbook?${qs}` : "/admin/guestbook";
}

export default async function GuestbookPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const mode = (
    sp.mode === "reported" ? "reported" : "all"
  ) as FilterMode;
  const page = Math.max(1, Number(sp.page) || 1);

  // 신고됨 모드면 먼저 미해결 신고 가져와서 target_id 추출
  let reportedIds: string[] | null = null;
  if (mode === "reported") {
    const { rows: r } = await adminList<Report>(
      "content_reports?select=target_id&target_type=eq.basecamp_guestbook&resolved=eq.false",
      { from: 0, to: 999 }
    );
    reportedIds = Array.from(new Set(r.map((x) => x.target_id)));
    if (reportedIds.length === 0) {
      return (
        <main className="p-6 lg:p-10">
          <PageHeader total={0} mode={mode} />
          <Tabs q={q} mode={mode} />
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
            신고된 메시지가 없습니다.
          </div>
        </main>
      );
    }
  }

  const params = new URLSearchParams({
    select: "id,owner_user_id,author_user_id,content,created_at",
    order: "created_at.desc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set("content", `ilike.*${t}*`);
  }
  if (reportedIds) {
    params.set("id", `in.(${reportedIds.join(",")})`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows: messages, total } = await adminList<GuestbookMessage>(
    `basecamp_guestbook?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 닉네임 + 신고 매핑 일괄 조회
  const userIds = Array.from(
    new Set([
      ...messages.map((m) => m.owner_user_id),
      ...messages.map((m) => m.author_user_id),
    ])
  );
  const messageIds = messages.map((m) => m.id);

  const [{ rows: users }, { rows: reports }] = await Promise.all([
    userIds.length > 0
      ? adminList<ProfileMini>(
          `profiles?select=id,nickname&id=in.(${userIds.join(",")})`
        )
      : Promise.resolve({ rows: [] as ProfileMini[], total: 0 }),
    messageIds.length > 0
      ? adminList<Report>(
          `content_reports?select=target_id&target_type=eq.basecamp_guestbook&resolved=eq.false&target_id=in.(${messageIds.join(",")})`
        )
      : Promise.resolve({ rows: [] as Report[], total: 0 }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.nickname]));
  const reportCountMap = new Map<string, number>();
  reports.forEach((r) =>
    reportCountMap.set(r.target_id, (reportCountMap.get(r.target_id) ?? 0) + 1)
  );

  const enriched: GuestbookRow[] = messages.map((m) => ({
    ...m,
    owner_nickname: userMap.get(m.owner_user_id) ?? null,
    author_nickname: userMap.get(m.author_user_id) ?? null,
    reportCount: reportCountMap.get(m.id) ?? 0,
  }));

  return (
    <main className="p-6 lg:p-10">
      <PageHeader total={total} mode={mode} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          action="/admin/guestbook"
          method="get"
          className="flex gap-2 flex-1 max-w-md min-w-[240px]"
        >
          <input type="hidden" name="mode" value={mode} />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              name="q"
              type="text"
              placeholder="메시지 내용 검색"
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

        <Tabs q={q} mode={mode} />
      </div>

      <GuestbookTable rows={enriched} />

      <Pagination
        basePath="/admin/guestbook"
        page={page}
        totalPages={totalPages}
        query={{
          q: q || undefined,
          mode: mode !== "all" ? mode : undefined,
        }}
      />
    </main>
  );
}

function PageHeader({ total, mode }: { total: number; mode: FilterMode }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
        방명록
      </h1>
      <p className="text-sm text-gray-400 mt-1">
        {LABELS[mode]} · 총 {total.toLocaleString()}건
      </p>
    </header>
  );
}

function Tabs({ q, mode }: { q: string; mode: FilterMode }) {
  const tabs: FilterMode[] = ["all", "reported"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const active = mode === t;
        return (
          <Link
            key={t}
            href={buildHref({ q: q || undefined, mode: t })}
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
  );
}
