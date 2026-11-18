import Link from "next/link";
import { notFound } from "next/navigation";
import { adminList } from "@/lib/admin-rest";
import type { AdCampaignRow } from "@/lib/ads";
import AdForm from "../AdForm";

export const dynamic = "force-dynamic";

type StatRow = { day: string; impressions: number; clicks: number };

export default async function EditAdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await adminList<AdCampaignRow>(`ad_campaigns?select=*&id=eq.${id}`);
  const row = rows[0];
  if (!row) notFound();
  const { rows: stats } = await adminList<StatRow>(
    `ad_daily_stats?select=day,impressions,clicks&campaign_id=eq.${id}&order=day.desc`,
    { from: 0, to: 29 }
  );

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <Link href="/admin/ads" className="text-xs text-gray-400 hover:text-gray-200">
          ← 광고 목록
        </Link>
        <h1 className="mt-2 text-2xl lg:text-3xl font-bold text-white tracking-tight">{row.name}</h1>
      </header>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <AdForm initial={row} />
        <aside className="rounded-xl border border-white/10 bg-white/[0.02] p-4 h-fit">
          <h2 className="text-sm font-semibold text-white mb-3">최근 30일 일별</h2>
          {stats.length === 0 ? (
            <p className="text-xs text-gray-500">아직 집계가 없어요.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-left font-medium py-1">날짜</th>
                  <th className="text-right font-medium py-1">노출</th>
                  <th className="text-right font-medium py-1">클릭</th>
                </tr>
              </thead>
              <tbody className="text-gray-200 tabular-nums">
                {stats.map((s) => (
                  <tr key={s.day} className="border-t border-white/[0.06]">
                    <td className="py-1">{s.day.slice(5)}</td>
                    <td className="py-1 text-right">{s.impressions}</td>
                    <td className="py-1 text-right">{s.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </aside>
      </div>
    </main>
  );
}
