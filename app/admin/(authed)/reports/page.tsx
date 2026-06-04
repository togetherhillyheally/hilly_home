import Link from "next/link";
import { adminList } from "@/lib/admin-rest";
import Pagination from "../Pagination";
import ReportsTable, { type ReportRow } from "./ReportsTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type StatusFilter = "pending" | "resolved" | "all";
const LABELS: Record<StatusFilter, string> = {
  pending: "대기",
  resolved: "처리완료",
  all: "전체",
};

type Report = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

type ProfileMini = { id: string; nickname: string | null };
type GuestbookMini = {
  id: string;
  content: string | null;
  author_user_id: string | null;
};

function buildHref(s: { status?: StatusFilter; page?: number }): string {
  const sp = new URLSearchParams();
  if (s.status && s.status !== "pending") sp.set("status", s.status);
  if (s.page && s.page > 1) sp.set("page", String(s.page));
  const qs = sp.toString();
  return qs ? `/admin/reports?${qs}` : "/admin/reports";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = (
    ["pending", "resolved", "all"].includes(sp.status ?? "")
      ? sp.status
      : "pending"
  ) as StatusFilter;
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select: "id,reporter_id,target_type,target_id,reason,resolved,resolved_at,created_at",
    order: "created_at.desc",
  });
  if (status === "pending") params.set("resolved", "eq.false");
  else if (status === "resolved") params.set("resolved", "eq.true");

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows: reports, total } = await adminList<Report>(
    `content_reports?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 신고자 닉네임 + 신고 대상(현재는 basecamp_guestbook만) 미리보기 일괄 조회
  const reporterIds = Array.from(new Set(reports.map((r) => r.reporter_id)));
  const guestbookIds = Array.from(
    new Set(
      reports
        .filter((r) => r.target_type === "basecamp_guestbook")
        .map((r) => r.target_id)
    )
  );

  const profilesMap = new Map<string, string | null>();
  const guestbookMap = new Map<
    string,
    { content: string | null; author: string | null }
  >();

  if (reporterIds.length > 0) {
    const { rows } = await adminList<ProfileMini>(
      `profiles?select=id,nickname&id=in.(${reporterIds.join(",")})`
    );
    rows.forEach((p) => profilesMap.set(p.id, p.nickname));
  }
  if (guestbookIds.length > 0) {
    const { rows } = await adminList<GuestbookMini>(
      `basecamp_guestbook?select=id,content,author_user_id&id=in.(${guestbookIds.join(",")})`
    );
    rows.forEach((g) =>
      guestbookMap.set(g.id, {
        content: g.content,
        author: g.author_user_id,
      })
    );
  }

  const enriched: ReportRow[] = reports.map((r) => {
    const gb =
      r.target_type === "basecamp_guestbook"
        ? guestbookMap.get(r.target_id)
        : null;
    return {
      ...r,
      reporter_nickname: profilesMap.get(r.reporter_id) ?? null,
      preview: gb?.content ?? null,
      preview_author: gb?.author ?? null,
    };
  });

  const tabs: StatusFilter[] = ["pending", "resolved", "all"];

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          콘텐츠 신고
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {LABELS[status]} · 총 {total.toLocaleString()}건
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const active = status === t;
          return (
            <Link
              key={t}
              href={buildHref({ status: t })}
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

      <ReportsTable rows={enriched} />

      <Pagination
        basePath="/admin/reports"
        page={page}
        totalPages={totalPages}
        query={{ status: status !== "pending" ? status : undefined }}
      />
    </main>
  );
}
