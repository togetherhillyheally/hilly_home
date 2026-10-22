import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import { getEventConfig } from "@/lib/event-catalog";
import TeamBoard, { type SignupRow } from "./TeamBoard";

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
    `event_signups?select=id,order_id,user_id,name,phone,email,birth,gender,emergency_name,emergency_relation,emergency_phone,experience,note,agree_photo,amount,order_total,party_size,is_leader,status,paid_at,canceled_at,created_at,team_no,squad&event_slug=eq.${encodeURIComponent(slug)}&order=created_at.asc`,
    { from: 0, to: 1999 }
  );
  if (rows.length === 0) notFound();

  const cfg = getEventConfig(slug);

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

      <TeamBoard slug={slug} config={cfg} initialRows={rows} />
    </main>
  );
}
