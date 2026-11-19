import { adminList } from "@/lib/admin-rest";
import { HandCoins } from "lucide-react";
import SponsorSettingsEditor from "./SponsorSettingsEditor";
import SettleButton from "./SettleButton";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  user_id: string;
  broadcast_id: string | null;
  amount: number;
  status: "pending" | "paid" | "failed" | "canceled" | "refunded";
  created_at: string;
  metadata: { receipt?: string | null; method?: string | null; display_name?: string | null } | null;
};
type BroadcastRow = {
  id: string;
  title: string;
  slug: string | null;
  kind: string;
  status: string;
  host_user_id: string;
  sponsor_total: number;
  sponsor_count: number;
  ended_at: string | null;
};
type SettlementRow = {
  broadcast_id: string;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  paid_at: string | null;
};
type AccountRow = { user_id: string; bank_name: string; account_number: string; holder_name: string };
type ProfileRow = { id: string; nickname: string | null };

const STATUS_LABEL: Record<OrderRow["status"], string> = {
  pending: "대기",
  paid: "결제 완료",
  failed: "실패",
  canceled: "취소",
  refunded: "환불",
};
const STATUS_CLASS: Record<OrderRow["status"], string> = {
  pending: "text-gray-500",
  paid: "text-emerald-300",
  failed: "text-red-400",
  canceled: "text-gray-500",
  refunded: "text-orange-300",
};
const NONE = "00000000-0000-0000-0000-000000000000";

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 후원 정산 — 방송별 결제 완료 합계 → 수수료 제하고 도전자 계좌로 이체 후 [정산 완료] */
export default async function SponsorshipsPage() {
  const { rows: orders } = await adminList<OrderRow>(
    "payment_orders?select=id,user_id,broadcast_id,amount,status,created_at,metadata&type=eq.sponsorship&order=created_at.desc&limit=500"
  );
  const bcIds = Array.from(new Set(orders.map((o) => o.broadcast_id).filter(Boolean))) as string[];
  const inBc = bcIds.length > 0 ? bcIds.join(",") : NONE;

  const [{ rows: broadcasts }, { rows: settlements }, { rows: settingsRows }] = await Promise.all([
    adminList<BroadcastRow>(
      `broadcasts?select=id,title,slug,kind,status,host_user_id,sponsor_total,sponsor_count,ended_at&id=in.(${inBc})`
    ),
    adminList<SettlementRow>("broadcast_settlements?select=broadcast_id,gross_amount,fee_amount,net_amount,paid_at"),
    adminList<{ sponsor_fee_rate: number; sponsor_payments_enabled: boolean }>(
      "payment_settings?select=sponsor_fee_rate,sponsor_payments_enabled&id=eq.true"
    ),
  ]);

  const hostIds = Array.from(new Set(broadcasts.map((b) => b.host_user_id)));
  const userIds = Array.from(new Set([...hostIds, ...orders.map((o) => o.user_id)]));
  const [{ rows: accounts }, { rows: profiles }] = await Promise.all([
    adminList<AccountRow>(
      `host_payout_accounts?select=user_id,bank_name,account_number,holder_name&user_id=in.(${hostIds.length ? hostIds.join(",") : NONE})`
    ),
    adminList<ProfileRow>(`profiles?select=id,nickname&id=in.(${userIds.length ? userIds.join(",") : NONE})`),
  ]);

  const feeRate = Number(settingsRows[0]?.sponsor_fee_rate ?? 0.1);
  const paymentsEnabled = settingsRows[0]?.sponsor_payments_enabled === true;
  const settlementByBc = new Map(settlements.map((s) => [s.broadcast_id, s]));
  const accountByUser = new Map(accounts.map((a) => [a.user_id, a]));
  const nickById = new Map(profiles.map((p) => [p.id, p.nickname ?? "이름 없음"]));

  const queue = broadcasts
    .map((b) => {
      const paid = orders.filter((o) => o.broadcast_id === b.id && o.status === "paid");
      const gross = paid.reduce((s, o) => s + o.amount, 0);
      const fee = Math.floor(gross * feeRate);
      return {
        b,
        paidCount: paid.length,
        gross,
        fee,
        net: gross - fee,
        settlement: settlementByBc.get(b.id) ?? null,
        account: accountByUser.get(b.host_user_id) ?? null,
        hostNickname: nickById.get(b.host_user_id) ?? "이름 없음",
      };
    })
    .filter((q) => q.gross > 0 || q.settlement)
    .sort((a, b) => (a.settlement === b.settlement ? 0 : a.settlement ? 1 : -1));

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center gap-2.5 mb-1">
        <HandCoins className="h-5 w-5 text-amber-300" />
        <h1 className="text-xl font-bold text-white">후원 정산</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        라이브 중계 후원 결제 현황과 도전자 정산 큐 — 이체 완료 후 [정산 완료]를 눌러 기록하세요. 환불은 토스 대시보드에서
        취소하면 웹훅이 자동 반영해요.
      </p>

      <SponsorSettingsEditor rate={feeRate} paymentsEnabled={paymentsEnabled} />

      <h2 className="text-sm font-semibold text-white mb-2">정산 큐 (방송별)</h2>
      {queue.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center text-sm text-gray-500 mb-8">
          아직 결제 완료된 후원이 없어요.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 mb-8">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs text-gray-400">
              <tr>
                <th className="px-3 py-2.5 font-medium">방송</th>
                <th className="px-3 py-2.5 font-medium">도전자 · 계좌</th>
                <th className="px-3 py-2.5 font-medium text-right">건수</th>
                <th className="px-3 py-2.5 font-medium text-right">총액</th>
                <th className="px-3 py-2.5 font-medium text-right">수수료</th>
                <th className="px-3 py-2.5 font-medium text-right">실지급</th>
                <th className="px-3 py-2.5 font-medium">정산</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {queue.map((q) => (
                <tr key={q.b.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5">
                    <span className="block font-semibold text-white">{q.b.title}</span>
                    <span className="block text-xs text-gray-500">
                      {q.b.kind === "tracker_event" ? "레이스" : "개인 중계"} · {q.b.status === "live" ? "진행 중" : "종료"}
                      {q.b.slug ? ` · /live/${q.b.slug}` : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block text-gray-200">{q.hostNickname}</span>
                    <span className="block text-xs text-gray-500">
                      {q.account
                        ? `${q.account.bank_name} ${q.account.account_number} (${q.account.holder_name})`
                        : "계좌 미등록 — 앱에서 정산 계좌 등록 필요"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-200">{q.paidCount}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-200">{q.gross.toLocaleString()}원</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-400">
                    {(q.settlement?.fee_amount ?? q.fee).toLocaleString()}원
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-300 font-semibold">
                    {(q.settlement?.net_amount ?? q.net).toLocaleString()}원
                  </td>
                  <td className="px-3 py-2.5">
                    {q.settlement ? (
                      <span className="text-xs text-gray-400">완료 {fmtDate(q.settlement.paid_at)}</span>
                    ) : (
                      <SettleButton
                        broadcastId={q.b.id}
                        title={q.b.title}
                        net={q.net}
                        disabled={q.b.status === "live" || !q.account}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="text-sm font-semibold text-white mb-2">최근 결제</h2>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs text-gray-400">
            <tr>
              <th className="px-3 py-2.5 font-medium">일시</th>
              <th className="px-3 py-2.5 font-medium">후원자</th>
              <th className="px-3 py-2.5 font-medium">방송</th>
              <th className="px-3 py-2.5 font-medium text-right">금액</th>
              <th className="px-3 py-2.5 font-medium">상태</th>
              <th className="px-3 py-2.5 font-medium">영수증</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                  결제 기록이 없어요.
                </td>
              </tr>
            ) : (
              orders.slice(0, 100).map((o) => (
                <tr key={o.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-gray-400 tabular-nums">{fmtDate(o.created_at)}</td>
                  <td className="px-3 py-2 text-gray-200">
                    {nickById.get(o.user_id) ?? "이름 없음"}
                    {o.metadata?.display_name ? (
                      <span className="text-xs text-gray-500"> ({o.metadata.display_name})</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-gray-300">
                    {broadcasts.find((b) => b.id === o.broadcast_id)?.title ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-200">{o.amount.toLocaleString()}원</td>
                  <td className={`px-3 py-2 text-xs ${STATUS_CLASS[o.status]}`}>{STATUS_LABEL[o.status]}</td>
                  <td className="px-3 py-2">
                    {o.metadata?.receipt ? (
                      <a href={o.metadata.receipt} target="_blank" rel="noreferrer" className="text-xs text-blue-300 hover:underline">
                        보기
                      </a>
                    ) : (
                      <span className="text-xs text-gray-600">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
