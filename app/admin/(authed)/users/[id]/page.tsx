import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Flame,
  MessageSquare,
  Mountain,
  Tent,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import RoleBadge from "../../RoleBadge";
import InventoryManager, {
  type CatalogObject,
  type OwnedObject,
} from "./InventoryManager";

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
type FirewoodBalance = { trail_id: string; pieces: number };
type InventoryRow = {
  object_id: string;
  unlocked_at: string;
  source: string | null;
};
type CampRow = {
  is_active: boolean;
  name: string | null;
  slot_index: number;
};
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
    fw,
    inv,
    camps,
    hosted,
    participations,
    guestbookAuthored,
    guestbookOnCamp,
    ledger,
  ] = await Promise.all([
    adminList<CampfireBalance>(
      `puzzle_campfire_balance?select=balance&user_id=eq.${id}&limit=1`
    ),
    adminList<FirewoodBalance>(
      `puzzle_firewood_balance?select=trail_id,pieces&user_id=eq.${id}`
    ),
    adminList<InventoryRow>(
      `user_basecamp_inventory?select=object_id,unlocked_at,source&user_id=eq.${id}`,
      { from: 0, to: 999 }
    ),
    adminList<CampRow>(
      `user_basecamp?select=is_active,name,slot_index&user_id=eq.${id}&order=slot_index.asc`
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
  const firewoodTotal = fw.rows.reduce((sum, r) => sum + r.pieces, 0);
  const firewoodTrails = fw.rows.length;
  const inventoryCount = inv.rows.length;
  const activeCamp = camps.rows.find((c) => c.is_active);

  // 참가 모험의 session 정보 일괄 조회
  const sessionIds = participations.rows.map((p) => p.session_id);
  const sessionMap = new Map<string, SessionMini>();
  if (sessionIds.length > 0) {
    const { rows } = await adminList<SessionMini>(
      `hiking_sessions?select=id,title,mountain_name,status,meeting_at&id=in.(${sessionIds.join(",")})`
    );
    rows.forEach((s) => sessionMap.set(s.id, s));
  }

  // 카탈로그 + 인벤토리 객체 정보 매핑
  const { rows: catalog } = await adminList<CatalogObject>(
    "basecamp_objects?select=id,name,category,storage_path&order=category.asc,sort_order.asc.nullslast,name.asc",
    { from: 0, to: 999 }
  );
  const catalogMap = new Map(catalog.map((c) => [c.id, c]));
  const ownedObjects: OwnedObject[] = inv.rows
    .map((i) => {
      const obj = catalogMap.get(i.object_id);
      if (!obj) return null;
      return {
        ...obj,
        unlocked_at: i.unlocked_at,
        source: i.source,
      } as OwnedObject;
    })
    .filter((x): x is OwnedObject => x !== null);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={Coins}
          label="모닥불 잔액"
          value={campfireBalance.toLocaleString()}
          accent="orange"
        />
        <MetricCard
          icon={Flame}
          label={`장작 합계 (${firewoodTrails}개 트레일)`}
          value={firewoodTotal.toLocaleString()}
          accent="pink"
        />
        <MetricCard
          icon={Tent}
          label={`인벤토리 / 캠프 슬롯`}
          value={`${inventoryCount} / ${camps.rows.length}`}
          accent="violet"
        />
        <MetricCard
          icon={Trophy}
          label={
            activeCamp
              ? `활성: ${activeCamp.name ?? "이름 없음"}`
              : "활성 캠프 없음"
          }
          value={activeCamp ? `#${activeCamp.slot_index}` : "—"}
          accent="emerald"
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

      {/* 인벤토리 관리 */}
      <div className="mt-6">
        <InventoryManager
          userId={profile.id}
          owned={ownedObjects}
          catalog={catalog}
        />
      </div>

      {/* 통화 변동 이력 */}
      <div className="mt-6">
        <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-white">
                통화 변동 이력
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
                    <th className="text-left px-3 py-2 font-medium">통화</th>
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
                                : "bg-pink-500/15 text-pink-300 border-pink-500/30"
                            }`}
                          >
                            {r.currency}
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
          )}
        </section>
      </div>

      {/* 내 캠프 방명록 별도 */}
      <div className="mt-6">
        <Section
          title="내 캠프에 작성된 방명록"
          count={guestbookOnCamp.total}
          icon={MessageSquare}
          empty="내 캠프에 작성된 방명록이 없어요."
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
