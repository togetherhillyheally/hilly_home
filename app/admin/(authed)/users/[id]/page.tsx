import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  MessageSquare,
  Mountain,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import RoleBadge from "../../RoleBadge";
import GrantSeedsButton from "./GrantSeedsButton";
import GardenPanel from "./GardenPanel";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  email: string | null;
  region: string | null;
  activity: string | null;
  birthday: string | null;
  created_at: string;
  phone_verified_at: string | null;
  is_super_admin: boolean | null;
  is_puzzle_admin: boolean | null;
  is_host_verified: boolean | null;
  is_tester: boolean | null;
};

type CampfireBalance = { balance: number };
type SeedBalance = { trail_id: string | null; pieces: number };
type SessionMini = {
  id: string;
  title: string;
  mountain_name: string;
  status: string;
  meeting_at: string;
};
type ParticipantRow = {
  session_id: string;
  status: string;
  applied_at: string;
};
type GuestbookMini = {
  id: string;
  owner_user_id: string;
  content: string;
  created_at: string;
};

type LedgerRow = {
  id: string;
  currency: string;
  trail_id: string | null;
  delta: number;
  reason: string | null;
  balance_after: number | null;
  created_at: string;
};

const LEDGER_REASON_LABELS: Record<string, string> = {
  session_complete: "모험 완료",
  puzzle_reveal: "조각 뽑기",
  puzzle_milestone: "퍼즐 마일스톤",
  puzzle_complete: "퍼즐 완성",
  tier_upgrade: "퍼즐 티어업",
  basecamp_unlock: "오브젝트 해금",
  signup_bonus: "가입 보너스",
  admin_adjust: "관리자 조정",
  admin_grant: "관리자 지급",
  walk_exchange: "걸음 교환",
  garden_seed_earn: "정원 씨앗 획득",
  garden_plant_care: "식물 돌보기",
  garden_plant_seed: "식물 심기",
  trail_download: "지도 다운로드",
  stamp_completion_bonus: "스탬프 완주 보너스",
  stamp_rank_bonus: "스탬프 등수 보너스",
  companion_bonus: "함께 걷기 보너스",
  campfire_migration: "모닥불 이관",
  campfire_retired: "모닥불 폐지",
  firewood_merge: "장작 병합",
  legacy_unknown: "이전 이력",
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

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent: "orange" | "pink" | "violet" | "emerald";
}) {
  const cls: Record<string, string> = {
    orange: "bg-orange-400/10 text-orange-300",
    pink: "bg-pink-400/10 text-pink-300",
    violet: "bg-violet-400/10 text-violet-300",
    emerald: "bg-emerald-400/10 text-emerald-300",
  };
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${cls[accent]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${STATUS_COLOR[status] ?? "bg-white/[0.04] text-gray-400 border-white/10"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows: profiles } = await adminList<Profile>(
    `profiles?id=eq.${id}&select=*&limit=1`
  );
  const profile = profiles[0];
  if (!profile) notFound();

  // 한 번에 평행 fetch
  const [
    cf,
    seedGen,
    seedTrail,
    hosted,
    participations,
    guestbookAuthored,
    guestbookOnCamp,
    ledger,
  ] = await Promise.all([
    adminList<CampfireBalance>(
      `puzzle_campfire_balance?select=balance&user_id=eq.${id}&limit=1`
    ),
    adminList<{ balance: number }>(
      `garden_seed_balance?select=balance&user_id=eq.${id}&limit=1`
    ),
    adminList<SeedBalance>(
      `garden_trail_seed_balance?select=trail_id,pieces&user_id=eq.${id}`
    ),
    adminList<SessionMini>(
      `hiking_sessions?select=id,title,mountain_name,status,meeting_at&host_id=eq.${id}&order=meeting_at.desc`,
      { from: 0, to: 9, count: true }
    ),
    adminList<ParticipantRow>(
      `hiking_session_participants?select=session_id,status,applied_at&user_id=eq.${id}&order=applied_at.desc`,
      { from: 0, to: 9, count: true }
    ),
    adminList<GuestbookMini>(
      `basecamp_guestbook?select=id,owner_user_id,content,created_at&author_user_id=eq.${id}&order=created_at.desc`,
      { from: 0, to: 4, count: true }
    ),
    adminList<GuestbookMini>(
      `basecamp_guestbook?select=id,owner_user_id,content,created_at&owner_user_id=eq.${id}&order=created_at.desc`,
      { from: 0, to: 4, count: true }
    ),
    adminList<LedgerRow>(
      `currency_ledger?select=id,currency,trail_id,delta,reason,balance_after,created_at&user_id=eq.${id}&order=created_at.desc`,
      { from: 0, to: 19, count: true }
    ),
  ]);

  const campfireBalance = cf.rows[0]?.balance ?? 0;
  const seedGeneric = seedGen.rows[0]?.balance ?? 0;
  const seedBrandTotal = seedTrail.rows
    .filter((r) => r.trail_id)
    .reduce((sum, r) => sum + r.pieces, 0);
  const seedBrandTrails = seedTrail.rows.filter((r) => r.trail_id).length;

  // 참가 모험의 session 정보 일괄 조회
  const sessionIds = participations.rows.map((p) => p.session_id);
  const sessionMap = new Map<string, SessionMini>();
  if (sessionIds.length > 0) {
    const { rows } = await adminList<SessionMini>(
      `hiking_sessions?select=id,title,mountain_name,status,meeting_at&id=in.(${sessionIds.join(",")})`
    );
    rows.forEach((s) => sessionMap.set(s.id, s));
  }

  // 방명록 owner 닉네임 매핑
  const ownerIds = Array.from(
    new Set(guestbookAuthored.rows.map((g) => g.owner_user_id))
  );
  const ownerMap = new Map<string, string | null>();
  if (ownerIds.length > 0) {
    const { rows } = await adminList<ProfileMini>(
      `profiles?select=id,nickname&id=in.(${ownerIds.join(",")})`
    );
    rows.forEach((o) => ownerMap.set(o.id, o.nickname));
  }

  return (
    <main className="p-6 lg:p-10">
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> 유저 목록
        </Link>

        {/* 프로필 헤더 */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="w-20 h-20 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl text-gray-400 overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile.nickname ?? "?").slice(0, 1)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {profile.nickname ?? (
                  <span className="text-gray-600">(닉네임 없음)</span>
                )}
              </h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.is_super_admin ? (
                  <RoleBadge label="슈퍼" color="red" />
                ) : null}
                {profile.is_puzzle_admin ? (
                  <RoleBadge label="퍼즐" color="violet" />
                ) : null}
                {profile.is_host_verified ? (
                  <RoleBadge label="호스트" color="emerald" />
                ) : null}
                {profile.is_tester ? (
                  <RoleBadge label="테스터" color="gray" />
                ) : null}
              </div>
              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                <Field label="휴대폰" value={profile.phone_number} />
                <Field label="이메일" value={profile.email} />
                <Field label="지역" value={profile.region} />
                <Field label="활동" value={profile.activity} />
                <Field label="생일" value={profile.birthday} />
                <Field label="가입일" value={formatDate(profile.created_at)} />
                <Field
                  label="번호 인증"
                  value={formatDate(profile.phone_verified_at)}
                />
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* 핵심 지표 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          잔액
        </h2>
        <GrantSeedsButton
          userId={profile.id}
          nickname={profile.nickname}
          currentSeedBalance={seedGeneric}
          currentCampfireBalance={campfireBalance}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard
          icon={Sprout}
          label="씨앗 (일반)"
          value={seedGeneric.toLocaleString()}
          accent="emerald"
        />
        <MetricCard
          icon={Sprout}
          label={`브랜드 씨앗${seedBrandTrails > 0 ? ` (${seedBrandTrails} 트레일)` : ""}`}
          value={seedBrandTotal.toLocaleString()}
          accent="violet"
        />
        <MetricCard
          icon={Coins}
          label="정원 씨앗"
          value={campfireBalance.toLocaleString()}
          accent="orange"
        />
      </div>

      {/* 3컬럼 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 호스팅 모험 */}
        <Section
          title="호스팅한 모험"
          count={hosted.total}
          icon={Mountain}
          empty="아직 모험을 만들지 않았어요."
        >
          {hosted.rows.map((s) => (
            <li
              key={s.id}
              className="px-5 py-3 hover:bg-white/[0.02] border-t border-white/5 first:border-t-0"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-sm text-white truncate flex-1">
                  {s.title}
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="text-[11px] text-gray-500">
                {s.mountain_name} · {formatDate(s.meeting_at)}
              </div>
            </li>
          ))}
        </Section>

        {/* 참가 모험 */}
        <Section
          title="참가한 모험"
          count={participations.total}
          icon={Mountain}
          empty="참가한 모험이 없어요."
        >
          {participations.rows.map((p) => {
            const sess = sessionMap.get(p.session_id);
            return (
              <li
                key={p.session_id}
                className="px-5 py-3 hover:bg-white/[0.02] border-t border-white/5 first:border-t-0"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-sm text-white truncate flex-1">
                    {sess?.title ?? (
                      <code className="text-xs text-gray-500">
                        {p.session_id.slice(0, 8)}…
                      </code>
                    )}
                  </div>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-white/[0.04] text-gray-300 border-white/10">
                    {p.status}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {sess
                    ? `${sess.mountain_name} · ${formatDate(sess.meeting_at)}`
                    : `신청 ${formatDate(p.applied_at)}`}
                </div>
              </li>
            );
          })}
        </Section>

        {/* 작성한 방명록 */}
        <Section
          title="작성한 방명록"
          count={guestbookAuthored.total}
          icon={MessageSquare}
          empty="작성한 방명록이 없어요."
        >
          {guestbookAuthored.rows.map((g) => (
            <li
              key={g.id}
              className="px-5 py-3 hover:bg-white/[0.02] border-t border-white/5 first:border-t-0"
            >
              <div className="text-sm text-gray-200 line-clamp-2">
                {g.content}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                →{" "}
                {ownerMap.get(g.owner_user_id) ?? (
                  <span className="text-gray-600">(없음)</span>
                )}{" "}
                · {formatDate(g.created_at)}
              </div>
            </li>
          ))}
        </Section>
      </div>

      {/* 정원 (garden_plants 기반) */}
      <div className="mt-6">
        <GardenPanel userId={profile.id} />
      </div>

      {/* 씨앗 변동 이력 */}
      <div className="mt-6">
        <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-white">
                씨앗 변동 이력
              </h2>
              <span className="text-[11px] text-gray-500">
                · 최근 {ledger.rows.length}건 / 총 {ledger.total}
              </span>
            </div>
            <Link
              href={`/admin/ledger?q=${profile.id}`}
              className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-white"
            >
              전체보기
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {ledger.rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              변동 내역이 없어요.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-gray-400 text-xs">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">시각</th>
                    <th className="text-left px-3 py-2 font-medium">종류</th>
                    <th className="text-right px-3 py-2 font-medium">변동</th>
                    <th className="text-right px-3 py-2 font-medium">잔액</th>
                    <th className="text-left px-4 py-2 font-medium">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.rows.map((r) => {
                    const positive = r.delta >= 0;
                    return (
                      <tr
                        key={r.id}
                        className="border-t border-white/5 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-2 text-[11px] font-mono text-gray-400 whitespace-nowrap">
                          {formatDate(r.created_at)}
                        </td>
                        <td className="px-3 py-2 text-xs">
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
                        <td
                          className={`px-3 py-2 text-right font-mono text-sm whitespace-nowrap ${
                            positive ? "text-emerald-300" : "text-red-300"
                          }`}
                        >
                          {positive ? "+" : ""}
                          {r.delta.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-gray-400 whitespace-nowrap">
                          {r.balance_after != null
                            ? r.balance_after.toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-300 max-w-[260px]">
                          {r.reason ? (
                            <span
                              className="truncate inline-block max-w-full align-bottom"
                              title={r.reason}
                            >
                              {LEDGER_REASON_LABELS[r.reason] ?? r.reason}
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
          )}
        </section>
      </div>

      {/* 내 정원 방명록 별도 */}
      <div className="mt-6">
        <Section
          title="내 정원에 작성된 방명록"
          count={guestbookOnCamp.total}
          icon={MessageSquare}
          empty="내 정원에 작성된 방명록이 없어요."
        >
          {guestbookOnCamp.rows.map((g) => (
            <li
              key={g.id}
              className="px-5 py-3 hover:bg-white/[0.02] border-t border-white/5 first:border-t-0"
            >
              <div className="text-sm text-gray-200 line-clamp-2">
                {g.content}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                {formatDate(g.created_at)}
              </div>
            </li>
          ))}
        </Section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-200 truncate">{value || "—"}</dd>
    </div>
  );
}

function Section({
  title,
  count,
  icon: Icon,
  children,
  empty,
}: {
  title: string;
  count: number;
  icon: LucideIcon;
  children: React.ReactNode;
  empty: string;
}) {
  const childrenArr = Array.isArray(children) ? children : [children];
  const hasItems = childrenArr.length > 0;
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
        <ul className="divide-y divide-white/5">{children}</ul>
      ) : (
        <div className="p-8 text-center text-xs text-gray-500">{empty}</div>
      )}
    </section>
  );
}
