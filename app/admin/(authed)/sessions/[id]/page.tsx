import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bell,
  Calendar,
  ChevronLeft,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Navigation,
  Star,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { adminList } from "@/lib/admin-rest";

export const dynamic = "force-dynamic";

type Session = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  mountain_name: string;
  meeting_at: string;
  meeting_place: string;
  meeting_place_lat: number | null;
  meeting_place_lng: number | null;
  route_summary: string | null;
  capacity: number;
  status: string;
  supplies: string[] | null;
  cautions: string[] | null;
  created_at: string;
  updated_at: string;
  trail_id: string | null;
  cover_image_url: string | null;
  duration_minutes: number;
  started_at: string | null;
  extended: boolean;
  is_private: boolean;
  auto_approve: boolean;
  is_solo: boolean;
  invite_code: string | null;
  actual_distance_km: number | null;
  actual_elapsed_minutes: number | null;
};

type Participant = {
  id: string;
  user_id: string;
  status: string;
  applied_at: string;
  decided_at: string | null;
  invite_source: string | null;
};

type Review = {
  id: string;
  author_id: string;
  rating: number;
  content: string | null;
  photo_urls: string[] | null;
  created_at: string;
};

type Notice = {
  id: string;
  author_id: string;
  content: string;
  photo_urls: string[] | null;
  created_at: string;
};

type ChatMessage = {
  id: string;
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string;
};

type LiveLocation = {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  lat: number | null;
  lng: number | null;
  stamp_count: number | null;
  hidden: boolean;
  last_seen: string;
  joined_at: string;
};

type ProfileMini = { id: string; nickname: string | null };
type TrailMini = { id: string; name: string };

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

const PARTICIPANT_STATUS_COLOR: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  rejected: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_COLOR[status] ?? "bg-white/[0.04] text-gray-400 border-white/10"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows: sessions } = await adminList<Session>(
    `hiking_sessions?id=eq.${id}&select=*&limit=1`
  );
  const session = sessions[0];
  if (!session) notFound();

  const [
    { rows: participants },
    { rows: reviews },
    { rows: notices },
    { rows: chatMessages, total: chatTotal },
    { rows: liveParticipants },
  ] = await Promise.all([
    adminList<Participant>(
      `hiking_session_participants?select=*&session_id=eq.${id}&order=status.asc,applied_at.asc`,
      { from: 0, to: 199 }
    ),
    adminList<Review>(
      `hiking_session_reviews?select=*&session_id=eq.${id}&order=created_at.desc`,
      { from: 0, to: 49 }
    ),
    adminList<Notice>(
      `hiking_session_notices?select=*&session_id=eq.${id}&order=created_at.desc`,
      { from: 0, to: 49 }
    ),
    adminList<ChatMessage>(
      `hiking_session_chat_messages?select=id,user_id,nickname,avatar_url,content,created_at&session_id=eq.${id}&order=created_at.desc`,
      { from: 0, to: 99, count: true }
    ),
    adminList<LiveLocation>(
      `hiking_session_live_participants?select=*&session_id=eq.${id}&order=last_seen.desc`,
      { from: 0, to: 99 }
    ),
  ]);

  // 유저 닉네임 일괄 매핑
  const userIds = Array.from(
    new Set([
      session.host_id,
      ...participants.map((p) => p.user_id),
      ...reviews.map((r) => r.author_id),
      ...notices.map((n) => n.author_id),
      ...chatMessages.map((c) => c.user_id),
      ...liveParticipants.map((l) => l.user_id),
    ])
  );
  const userMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { rows } = await adminList<ProfileMini>(
      `profiles?select=id,nickname&id=in.(${userIds.join(",")})`
    );
    rows.forEach((u) => userMap.set(u.id, u.nickname));
  }

  // 트레일 매핑
  let trailName: string | null = null;
  if (session.trail_id) {
    const { rows } = await adminList<TrailMini>(
      `trails?select=id,name&id=eq.${session.trail_id}&limit=1`
    );
    trailName = rows[0]?.name ?? null;
  }

  const approvedCount = participants.filter((p) => p.status === "approved")
    .length;
  const pendingCount = participants.filter((p) => p.status === "pending")
    .length;

  return (
    <main className="p-6 lg:p-10">
      <Link
        href="/admin/sessions"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4"
      >
        <ChevronLeft className="h-4 w-4" /> 모험 목록
      </Link>

      {/* 헤더 카드 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden mb-6">
        {session.cover_image_url ? (
          <div className="aspect-[16/5] bg-white/[0.04] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={session.cover_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {session.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={session.status} />
              {session.is_solo ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-violet-500/15 text-violet-300 border-violet-500/30">
                  솔로
                </span>
              ) : null}
              {session.is_private ? (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-medium border bg-gray-500/15 text-gray-300 border-gray-500/30">
                  <Lock className="h-3 w-3" /> 비공개
                </span>
              ) : null}
              {session.auto_approve ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                  자동승인
                </span>
              ) : null}
            </div>
          </div>

          {session.description ? (
            <p className="text-sm text-gray-300 whitespace-pre-wrap mb-5">
              {session.description}
            </p>
          ) : null}

          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <InfoRow
              icon={User}
              label="호스트"
              value={
                userMap.get(session.host_id) ?? (
                  <span className="text-gray-600">(없음)</span>
                )
              }
            />
            <InfoRow
              icon={MapPin}
              label="산"
              value={session.mountain_name}
            />
            <InfoRow
              icon={MapPin}
              label="만남 장소"
              value={
                session.meeting_place_lat != null &&
                session.meeting_place_lng != null ? (
                  <a
                    href={`https://map.kakao.com/link/map/${encodeURIComponent(session.meeting_place)},${session.meeting_place_lat},${session.meeting_place_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-orange-300"
                  >
                    {session.meeting_place}
                  </a>
                ) : (
                  session.meeting_place
                )
              }
            />
            <InfoRow
              icon={Calendar}
              label="미팅 시각"
              value={formatDate(session.meeting_at)}
            />
            <InfoRow
              icon={Users}
              label="정원"
              value={`${approvedCount} / ${session.capacity}명${pendingCount > 0 ? ` (대기 ${pendingCount})` : ""}`}
            />
            <InfoRow
              icon={Calendar}
              label="예정 시간"
              value={`${session.duration_minutes}분`}
            />
            {session.trail_id ? (
              <InfoRow
                icon={MapPin}
                label="연결된 트레일"
                value={trailName ?? session.trail_id.slice(0, 8) + "…"}
              />
            ) : null}
            {session.started_at ? (
              <InfoRow
                icon={Calendar}
                label="시작 시각"
                value={formatDate(session.started_at)}
              />
            ) : null}
            {session.actual_distance_km != null ? (
              <InfoRow
                icon={MapPin}
                label="실제 거리"
                value={`${Number(session.actual_distance_km).toFixed(2)} km`}
              />
            ) : null}
            {session.actual_elapsed_minutes != null ? (
              <InfoRow
                icon={Calendar}
                label="실제 소요"
                value={`${session.actual_elapsed_minutes}분`}
              />
            ) : null}
            {session.invite_code ? (
              <InfoRow
                icon={Lock}
                label="초대코드"
                value={
                  <code className="text-xs bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5 text-gray-200">
                    {session.invite_code}
                  </code>
                }
              />
            ) : null}
          </dl>

          {session.supplies && session.supplies.length > 0 ? (
            <ArrayBlock label="준비물" items={session.supplies} />
          ) : null}
          {session.cautions && session.cautions.length > 0 ? (
            <ArrayBlock label="주의사항" items={session.cautions} accent />
          ) : null}

          <div className="mt-5 pt-4 border-t border-white/5 text-[11px] text-gray-500 flex flex-wrap gap-x-4">
            <span>
              session_id: <code className="text-gray-400">{session.id}</code>
            </span>
            <span>생성 {formatDate(session.created_at)}</span>
            <span>수정 {formatDate(session.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* 참가자 */}
      <Section
        title="참가자"
        count={participants.length}
        icon={Users}
        empty="참가자가 없어요."
      >
        {participants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">유저</th>
                  <th className="text-left px-3 py-2 font-medium">상태</th>
                  <th className="text-left px-3 py-2 font-medium">초대 경로</th>
                  <th className="text-left px-4 py-2 font-medium">신청</th>
                  <th className="text-left px-4 py-2 font-medium">결정</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2 text-xs">
                      <Link
                        href={`/admin/users/${p.user_id}`}
                        className="text-white hover:text-orange-300"
                      >
                        {userMap.get(p.user_id) ?? (
                          <span className="text-gray-600">(없음)</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${PARTICIPANT_STATUS_COLOR[p.status] ?? "bg-white/[0.04] text-gray-400 border-white/10"}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400">
                      {p.invite_source ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(p.applied_at)}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(p.decided_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 공지 */}
        <Section
          title="호스트 공지"
          count={notices.length}
          icon={Bell}
          empty="공지가 없어요."
          asList
        >
          {notices.map((n) => (
            <li
              key={n.id}
              className="px-5 py-3 border-t border-white/5 first:border-t-0 hover:bg-white/[0.02]"
            >
              <div className="text-sm text-gray-200 whitespace-pre-wrap">
                {n.content}
              </div>
              {n.photo_urls && n.photo_urls.length > 0 ? (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {n.photo_urls.slice(0, 4).map((u, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={u}
                      alt=""
                      className="w-14 h-14 rounded-md object-cover bg-white/[0.04]"
                    />
                  ))}
                </div>
              ) : null}
              <div className="text-[11px] text-gray-500 mt-2">
                {userMap.get(n.author_id) ?? "(없음)"} ·{" "}
                {formatDate(n.created_at)}
              </div>
            </li>
          ))}
        </Section>

        {/* 후기 */}
        <Section
          title="후기"
          count={reviews.length}
          icon={Star}
          empty="아직 후기가 없어요."
          asList
        >
          {reviews.map((r) => (
            <li
              key={r.id}
              className="px-5 py-3 border-t border-white/5 first:border-t-0 hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-1 mb-1.5">
                <Star className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />
                <span className="text-sm font-medium text-white">
                  {Number(r.rating).toFixed(1)}
                </span>
              </div>
              {r.content ? (
                <div className="text-sm text-gray-300 whitespace-pre-wrap">
                  {r.content}
                </div>
              ) : null}
              {r.photo_urls && r.photo_urls.length > 0 ? (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {r.photo_urls.slice(0, 4).map((u, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={u}
                      alt=""
                      className="w-14 h-14 rounded-md object-cover bg-white/[0.04]"
                    />
                  ))}
                </div>
              ) : null}
              <div className="text-[11px] text-gray-500 mt-2">
                <Link
                  href={`/admin/users/${r.author_id}`}
                  className="hover:text-white"
                >
                  {userMap.get(r.author_id) ?? "(없음)"}
                </Link>{" "}
                · {formatDate(r.created_at)}
              </div>
            </li>
          ))}
        </Section>
      </div>

      {/* 실시간 위치 & 채팅 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section
          title="실시간 위치 (라이브)"
          count={liveParticipants.length}
          icon={Navigation}
          empty="라이브 참가 기록이 없어요."
          asList
        >
          {liveParticipants.map((l) => (
            <li
              key={l.user_id}
              className="px-5 py-3 border-t border-white/5 first:border-t-0 hover:bg-white/[0.02]"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={`/admin/users/${l.user_id}`}
                    className="text-sm text-white hover:text-orange-300 truncate"
                  >
                    {l.nickname ?? userMap.get(l.user_id) ?? "(없음)"}
                  </Link>
                  {l.hidden ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] border bg-gray-500/15 text-gray-300 border-gray-500/30">
                      숨김
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  {formatDate(l.last_seen)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                {l.lat != null && l.lng != null ? (
                  <a
                    href={`https://map.kakao.com/link/map/${encodeURIComponent(l.nickname ?? "위치")},${l.lat},${l.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-gray-300 hover:text-orange-300"
                  >
                    {l.lat.toFixed(5)}, {l.lng.toFixed(5)}
                  </a>
                ) : (
                  <span className="text-gray-600">위치 없음</span>
                )}
                <span className="text-gray-500">
                  스탬프 {l.stamp_count ?? 0}
                </span>
                <span className="text-gray-500">
                  참가 {formatDate(l.joined_at)}
                </span>
              </div>
            </li>
          ))}
        </Section>

        <Section
          title={`채팅 메시지 (최근 ${chatMessages.length}건 / 총 ${chatTotal})`}
          count={chatMessages.length}
          icon={MessageCircle}
          empty="채팅 메시지가 없어요."
          asList
        >
          {chatMessages.map((m) => (
            <li
              key={m.id}
              className="px-5 py-3 border-t border-white/5 first:border-t-0 hover:bg-white/[0.02]"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <Link
                  href={`/admin/users/${m.user_id}`}
                  className="text-xs text-gray-200 hover:text-orange-300 truncate"
                >
                  {m.nickname ?? userMap.get(m.user_id) ?? "(없음)"}
                </Link>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  {formatDate(m.created_at)}
                </span>
              </div>
              <div className="text-sm text-gray-100 whitespace-pre-wrap break-words">
                {m.content}
              </div>
            </li>
          ))}
        </Section>
      </div>
    </main>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] text-gray-500">{label}</div>
        <div className="text-gray-200 truncate">{value}</div>
      </div>
    </div>
  );
}

function ArrayBlock({
  label,
  items,
  accent,
}: {
  label: string;
  items: string[];
  accent?: boolean;
}) {
  return (
    <div className="mt-4">
      <div className="text-xs text-gray-500 mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s, i) => (
          <span
            key={i}
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${
              accent
                ? "bg-red-500/10 text-red-300 border-red-500/30"
                : "bg-white/[0.04] text-gray-300 border-white/10"
            }`}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  icon: Icon,
  children,
  empty,
  asList,
}: {
  title: string;
  count: number;
  icon: LucideIcon;
  children?: React.ReactNode;
  empty: string;
  asList?: boolean;
}) {
  const hasItems = count > 0;
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        <span className="text-[11px] text-gray-500">
          {count.toLocaleString()}건
        </span>
      </div>
      {hasItems ? (
        asList ? (
          <ul className="divide-y divide-white/5">{children}</ul>
        ) : (
          children
        )
      ) : (
        <div className="p-8 text-center text-xs text-gray-500">{empty}</div>
      )}
    </section>
  );
}
