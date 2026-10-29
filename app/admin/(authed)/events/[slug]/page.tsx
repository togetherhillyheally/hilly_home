import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import { getEventConfig } from "@/lib/event-catalog";
import TeamBoard, { type SignupRow } from "./TeamBoard";
import ConfirmSmsCard, { type EventSettings } from "./ConfirmSmsCard";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  if (!/^[a-z0-9-]+$/i.test(slug)) notFound();

  const { rows } = await adminList<SignupRow>(
    `event_signups?select=id,order_id,user_id,name,phone,email,birth,gender,emergency_name,emergency_relation,emergency_phone,experience,note,agree_photo,amount,order_total,party_size,is_leader,status,paid_at,canceled_at,created_at,team_no,squad,play_style,dinner,metadata&event_slug=eq.${encodeURIComponent(slug)}&order=created_at.asc`,
    { from: 0, to: 1999 }
  );
  if (rows.length === 0) notFound();

  const cfg = getEventConfig(slug);

  const { rows: settingsRows } = await adminList<EventSettings>(
    `event_settings?select=confirm_sms_enabled,confirm_sms_template,updated_at,updated_by&event_slug=eq.${encodeURIComponent(slug)}`
  );
  // 확정 문자 결과는 받은 참가자 행마다 metadata.confirm_sms 에 남는다
  // (2026-10-29 전 주문은 대장 행에만 있음)
  const smsResults = rows
    .map((r) => (r.metadata as { confirm_sms?: { ok?: boolean } } | null)?.confirm_sms)
    .filter((x): x is { ok?: boolean } => !!x);

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          이벤트 목록
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {cfg.name || slug}
          </h1>
          {cfg.dateLabel && (
            <span className="inline-flex items-center px-2 h-6 rounded-md bg-white/[0.04] border border-white/10 text-gray-300 text-[11px] font-medium">
              {cfg.dateLabel}
            </span>
          )}
          <span className="inline-flex items-center px-2 h-6 rounded-md bg-white/[0.04] border border-white/10 text-gray-400 text-[11px] font-mono">
            {slug}
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1.5">
          {cfg.teamSize}인 1팀 × {cfg.teamCount}팀 · 팀 안에서 {cfg.squadSize}인 1조(
          {cfg.squads.join("/")}) · 조마다 트래커 1개 · 정원 {cfg.capacity}명
        </p>
      </header>

      <ConfirmSmsCard
        slug={slug}
        initial={settingsRows[0] ?? null}
        sent={smsResults.filter((x) => x.ok).length}
        failed={smsResults.filter((x) => !x.ok).length}
      />

      <TeamBoard slug={slug} config={cfg} initialRows={rows} />
    </main>
  );
}
