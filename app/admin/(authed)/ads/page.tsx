import Link from "next/link";
import { Plus } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import {
  type AdCampaignRow,
  adImageUrl,
  adIsLive,
  placementLabel,
} from "@/lib/ads";
import SimpleActiveToggle from "../SimpleActiveToggle";

export const dynamic = "force-dynamic";

type StatRow = { campaign_id: string; day: string; impressions: number; clicks: number };

/** 광고 목록 — 자리·기간·가중치, 최근 7일 노출/클릭/CTR, 활성 토글 */
export default async function AdsPage() {
  const { rows, total } = await adminList<AdCampaignRow>(
    "ad_campaigns?select=*&order=created_at.desc",
    { from: 0, to: 199, count: true }
  );
  const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const { rows: stats } = await adminList<StatRow>(
    `ad_daily_stats?select=campaign_id,day,impressions,clicks&day=gte.${since}`,
    { from: 0, to: 4999 }
  );
  const agg = new Map<string, { imp: number; clk: number }>();
  for (const s of stats) {
    const a = agg.get(s.campaign_id) ?? { imp: 0, clk: 0 };
    a.imp += s.impressions;
    a.clk += s.clicks;
    agg.set(s.campaign_id, a);
  }
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : null;

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            광고
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            관전·중계 페이지 배너 · 총 {total.toLocaleString()}개 · 최근 7일 집계
          </p>
        </div>
        <Link
          href="/admin/ads/new"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          새 광고
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          등록된 광고가 없습니다. 「새 광고」로 이미지를 올리고 자리를 정해 주세요.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs text-gray-400">
              <tr>
                <th className="px-3 py-2.5 font-medium">광고</th>
                <th className="px-3 py-2.5 font-medium">자리</th>
                <th className="px-3 py-2.5 font-medium">기간</th>
                <th className="px-3 py-2.5 font-medium text-right">가중치</th>
                <th className="px-3 py-2.5 font-medium text-right">노출</th>
                <th className="px-3 py-2.5 font-medium text-right">클릭</th>
                <th className="px-3 py-2.5 font-medium text-right">CTR</th>
                <th className="px-3 py-2.5 font-medium">상태</th>
                <th className="px-3 py-2.5 font-medium">활성</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rows.map((r) => {
                const a = agg.get(r.id) ?? { imp: 0, clk: 0 };
                const ctr = a.imp > 0 ? ((a.clk / a.imp) * 100).toFixed(1) + "%" : "—";
                const live = adIsLive(r);
                return (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/ads/${r.id}`} className="flex items-center gap-3 group">
                        <span className="block h-10 w-[120px] shrink-0 overflow-hidden rounded-md bg-white/[0.04]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={adImageUrl(r.image_path)} alt="" className="h-full w-full object-cover" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-white group-hover:underline">
                            {r.name}
                          </span>
                          <span className="block truncate text-xs text-gray-400">
                            {r.advertiser ?? "광고주 미입력"}
                            {r.link_url ? ` · ${r.link_url.replace(/^https?:\/\//, "")}` : ""}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-gray-200">{placementLabel(r.placement)}</td>
                    <td className="px-3 py-2.5 text-gray-300 tabular-nums">
                      {fmtDate(r.starts_at) ?? "제한 없음"}
                      {r.ends_at ? ` ~ ${fmtDate(r.ends_at)}` : r.starts_at ? " ~" : ""}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-200">{r.weight}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-200">{a.imp.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-200">{a.clk.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-200">{ctr}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          "rounded-md px-2 py-0.5 text-[11px] font-semibold " +
                          (live ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-gray-400")
                        }
                      >
                        {live ? "노출 중" : r.is_active ? "기간 외" : "꺼짐"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <SimpleActiveToggle endpoint={`/api/admin/ads/${r.id}`} initial={r.is_active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
