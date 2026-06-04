import Link from "next/link";
import {
  ChevronRight,
  Flag,
  Mountain,
  UserMinus,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { adminList } from "@/lib/admin-rest";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fetchCount(path: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
  });
  const range = res.headers.get("content-range");
  if (!range) return 0;
  return Number(range.split("/")[1]) || 0;
}

type StatAccent = "default" | "orange" | "red";

function StatCard({
  icon: Icon,
  label,
  value,
  accent = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent?: StatAccent;
}) {
  const cls: Record<StatAccent, string> = {
    default: "bg-white/[0.04] text-gray-300",
    orange: "bg-orange-400/10 text-orange-300",
    red: "bg-red-400/10 text-red-300",
  };
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${cls[accent]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-bold text-white">
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

type RecentProfile = {
  id: string;
  nickname: string | null;
  phone_number: string | null;
  created_at: string;
};

type RecentReport = {
  id: string;
  reporter_id: string;
  target_type: string;
  reason: string | null;
  created_at: string;
};

type RecentSession = {
  id: string;
  title: string;
  mountain_name: string;
  status: string;
  meeting_at: string;
  host_id: string;
};

type ProfileMini = { id: string; nickname: string | null };

const STATUS_LABEL: Record<string, string> = {
  open: "모집중",
  completed: "완료",
  cancelled: "취소",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

function PanelHeader({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-white"
        >
          전체보기
          <ChevronRight className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [
    totalUsers,
    newToday,
    totalSessions,
    pendingDeletions,
    pendingReports,
    recentProfilesRes,
    recentReportsRes,
    recentSessionsRes,
  ] = await Promise.all([
    fetchCount("profiles?select=id"),
    fetchCount(`profiles?select=id&created_at=gte.${todayISO}`),
    fetchCount("hiking_sessions?select=id"),
    fetchCount("account_deletion_requests?select=id&status=eq.pending"),
    fetchCount("content_reports?select=id&resolved=eq.false"),
    adminList<RecentProfile>(
      "profiles?select=id,nickname,phone_number,created_at&order=created_at.desc",
      { from: 0, to: 4 }
    ),
    adminList<RecentReport>(
      "content_reports?select=id,reporter_id,target_type,reason,created_at&resolved=eq.false&order=created_at.desc",
      { from: 0, to: 4 }
    ),
    adminList<RecentSession>(
      "hiking_sessions?select=id,title,mountain_name,status,meeting_at,host_id&order=created_at.desc",
      { from: 0, to: 4 }
    ),
  ]);

  // 최근 신고 reporter 닉네임, 모험 host 닉네임 매핑
  const userIds = Array.from(
    new Set([
      ...recentReportsRes.rows.map((r) => r.reporter_id),
      ...recentSessionsRes.rows.map((r) => r.host_id),
    ])
  );
  const userMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { rows: users } = await adminList<ProfileMini>(
      `profiles?select=id,nickname&id=in.(${userIds.join(",")})`
    );
    users.forEach((u) => userMap.set(u.id, u.nickname));
  }

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          대시보드
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          서비스 운영 현황 요약 · 실시간
        </p>
      </header>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Users} label="총 유저" value={totalUsers} />
        <StatCard
          icon={UserPlus}
          label="오늘 신규 가입"
          value={newToday}
          accent="orange"
        />
        <StatCard icon={Mountain} label="총 모험" value={totalSessions} />
        <StatCard
          icon={UserMinus}
          label="삭제 요청 대기"
          value={pendingDeletions}
          accent="red"
        />
        <StatCard icon={Flag} label="신고 대기" value={pendingReports} />
      </div>

      {/* 최근 활동 3컬럼 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 최근 가입자 */}
        <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <PanelHeader title="최근 신규 가입" href="/admin/users" />
          {recentProfilesRes.rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              데이터 없음
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentProfilesRes.rows.map((p) => (
                <li
                  key={p.id}
                  className="px-5 py-3 hover:bg-white/[0.02] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {p.nickname ?? (
                        <span className="text-gray-600">(닉네임 없음)</span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-gray-500 truncate">
                      {p.phone_number ?? p.id.slice(0, 8) + "…"}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap">
                    {formatTime(p.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 미처리 신고 */}
        <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <PanelHeader title="미처리 신고" href="/admin/reports" />
          {recentReportsRes.rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              미처리 신고 없음
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentReportsRes.rows.map((r) => (
                <li key={r.id} className="px-5 py-3 hover:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-red-500/15 text-red-300 border-red-500/30">
                      {r.target_type}
                    </span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {formatTime(r.created_at)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300 line-clamp-2">
                    {r.reason ?? (
                      <span className="text-gray-600">사유 없음</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    신고자{" "}
                    <span className="text-gray-300">
                      {userMap.get(r.reporter_id) ??
                        r.reporter_id.slice(0, 8) + "…"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 최근 모험 */}
        <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <PanelHeader title="최근 모험" href="/admin/sessions" />
          {recentSessionsRes.rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              데이터 없음
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentSessionsRes.rows.map((s) => (
                <li key={s.id} className="px-5 py-3 hover:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-sm text-white truncate flex-1">
                      {s.title}
                    </div>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${STATUS_COLOR[s.status] ?? "bg-white/[0.04] text-gray-400 border-white/10"}`}
                    >
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {s.mountain_name} · 호스트{" "}
                    <span className="text-gray-300">
                      {userMap.get(s.host_id) ?? s.host_id.slice(0, 8) + "…"}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {formatTime(s.meeting_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
