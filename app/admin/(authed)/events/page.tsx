import Link from "next/link";
import { ChevronRight, Ticket } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import { getEventConfig } from "@/lib/event-catalog";

export const dynamic = "force-dynamic";

type Row = {
  event_slug: string;
  order_id: string;
  status: string;
  team_no: number | null;
  created_at: string;
};

type Summary = {
  slug: string;
  paid: number;
  pending: number;
  canceled: number;
  parties: number;
  assigned: number;
  latest: string;
};

export default async function EventsPage() {
  const { rows } = await adminList<Row>(
    `event_signups?select=event_slug,order_id,status,team_no,created_at&order=created_at.desc`,
    { from: 0, to: 4999 }
  );

  const bySlug = new Map<string, Summary & { orders: Set<string> }>();
  for (const r of rows) {
    let s = bySlug.get(r.event_slug);
    if (!s) {
      s = {
        slug: r.event_slug,
        paid: 0,
        pending: 0,
        canceled: 0,
        parties: 0,
        assigned: 0,
        latest: r.created_at,
        orders: new Set(),
      };
      bySlug.set(r.event_slug, s);
    }
    if (r.status === "paid") s.paid += 1;
    else if (r.status === "pending") s.pending += 1;
    else if (r.status === "canceled") s.canceled += 1;
    if (r.status === "paid" && r.team_no != null) s.assigned += 1;
    if (r.status !== "canceled") s.orders.add(r.order_id);
    if (r.created_at > s.latest) s.latest = r.created_at;
  }
  const events = Array.from(bySlug.values())
    .map((s) => ({ ...s, parties: s.orders.size }))
    .sort((a, b) => (a.latest < b.latest ? 1 : -1));

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          이벤트 신청
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          신청·결제 현황 확인과 팀/조 배정. 혼자 신청한 분들을 묶어 팀을 만들어요.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          아직 신청이 없어요.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((e) => {
            const cfg = getEventConfig(e.slug);
            return (
              <Link
                key={e.slug}
                href={`/admin/events/${encodeURIComponent(e.slug)}`}
                className="group rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Ticket className="h-3.5 w-3.5 text-orange-300" />
                      <span className="font-mono truncate">{e.slug}</span>
                    </div>
                    <h2 className="text-base font-semibold text-white truncate">
                      {cfg.name || e.slug}
                      {cfg.dateLabel && (
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          {cfg.dateLabel}
                        </span>
                      )}
                    </h2>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-white shrink-0 mt-1" />
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <Stat label="결제" value={e.paid} tone="ok" />
                  <Stat label="대기" value={e.pending} tone="warn" />
                  <Stat label="취소" value={e.canceled} />
                  <Stat label="신청건" value={e.parties} />
                </div>

                <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${Math.min(100, (e.paid / Math.max(1, cfg.capacity)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-gray-500">
                  <span>
                    정원 {e.paid}/{cfg.capacity}
                  </span>
                  <span>
                    팀 배정 {e.assigned}/{e.paid}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-gray-200";
  return (
    <div className="rounded-lg bg-black/20 border border-white/5 py-2">
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
