import { adminList } from "@/lib/admin-rest";
import { Banknote } from "lucide-react";
import FeeRateEditor from "./FeeRateEditor";
import SettleButton from "./SettleButton";
import RefundButton from "./RefundButton";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  user_id: string;
  session_id: string | null;
  amount: number;
  order_name: string;
  status: "pending" | "paid" | "failed" | "canceled" | "refunded";
  created_at: string;
};

type SessionRow = {
  id: string;
  title: string;
  host_id: string;
  meeting_at: string;
  status: string;
  participation_fee: number;
};

type SettlementRow = {
  session_id: string;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  paid_at: string | null;
};

type AccountRow = {
  user_id: string;
  bank_name: string;
  account_number: string;
  holder_name: string;
};

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

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default async function SettlementsPage() {
  const { rows: orders } = await adminList<OrderRow>(
    "payment_orders?select=id,user_id,session_id,amount,order_name,status,created_at&type=eq.session_fee&order=created_at.desc&limit=300"
  );

  const sessionIds = Array.from(
    new Set(orders.map((o) => o.session_id).filter(Boolean))
  ) as string[];
  const inSessions = sessionIds.length > 0 ? sessionIds.join(",") : "00000000-0000-0000-0000-000000000000";

  const [{ rows: sessions }, { rows: settlements }, { rows: settingsRows }] =
    await Promise.all([
      adminList<SessionRow>(
        `hiking_sessions?select=id,title,host_id,meeting_at,status,participation_fee&id=in.(${inSessions})`
      ),
      adminList<SettlementRow>(
        `session_settlements?select=session_id,gross_amount,fee_amount,net_amount,paid_at`
      ),
      adminList<{ session_fee_rate: number }>(
        "payment_settings?select=session_fee_rate&id=eq.true"
      ),
    ]);

  const hostIds = Array.from(new Set(sessions.map((s) => s.host_id)));
  const payerIds = Array.from(new Set(orders.map((o) => o.user_id)));
  const allUserIds = Array.from(new Set([...hostIds, ...payerIds]));
  const inHosts = hostIds.length > 0 ? hostIds.join(",") : "00000000-0000-0000-0000-000000000000";
  const inUsers = allUserIds.length > 0 ? allUserIds.join(",") : "00000000-0000-0000-0000-000000000000";

  const [{ rows: accounts }, { rows: profiles }] = await Promise.all([
    adminList<AccountRow>(
      `host_payout_accounts?select=user_id,bank_name,account_number,holder_name&user_id=in.(${inHosts})`
    ),
    adminList<ProfileRow>(`profiles?select=id,nickname&id=in.(${inUsers})`),
  ]);

  const feeRate = Number(settingsRows[0]?.session_fee_rate ?? 0.05);
  const settlementBySession = new Map(settlements.map((s) => [s.session_id, s]));
  const accountByUser = new Map(accounts.map((a) => [a.user_id, a]));
  const nickById = new Map(profiles.map((p) => [p.id, p.nickname ?? "이름 없음"]));

  const now = Date.now();
  const queue = sessions
    .map((s) => {
      const paidOrders = orders.filter(
        (o) => o.session_id === s.id && o.status === "paid"
      );
      const gross = paidOrders.reduce((sum, o) => sum + o.amount, 0);
      const settlement = settlementBySession.get(s.id) ?? null;
      const meetingOver =
        new Date(s.meeting_at).getTime() < now ||
        ["completed", "cancelled"].includes(s.status);
      return {
        session: s,
        paidCount: paidOrders.length,
        gross,
        fee: Math.floor(gross * feeRate),
        net: gross - Math.floor(gross * feeRate),
        settlement,
        meetingOver,
        account: accountByUser.get(s.host_id) ?? null,
        hostNickname: nickById.get(s.host_id) ?? "이름 없음",
      };
    })
    .filter((q) => q.gross > 0 || q.settlement)
    .sort((a, b) =>
      a.settlement === b.settlement
        ? b.session.meeting_at.localeCompare(a.session.meeting_at)
        : a.settlement
          ? 1
          : -1
    );

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center gap-2.5 mb-1">
        <Banknote className="h-5 w-5 text-emerald-300" />
        <h1 className="text-xl font-bold text-white">참가비 정산</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        유료 모임 참가비 결제 현황과 대장 정산 큐 — 이체 완료 후 [정산 완료]를
        눌러 기록하세요.
      </p>

      <FeeRateEditor rate={feeRate} />

      {/* 정산 큐 */}
      <section className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 text-sm font-semibold text-white">
          정산 큐{" "}
          <span className="text-[11px] font-normal text-gray-500">
            결제된 참가비가 있는 모임 (수수료 {(feeRate * 100).toFixed(1)}%)
          </span>
        </div>
        {queue.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500 text-center">
            아직 결제된 유료 모임이 없어요.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {queue.map((q) => (
              <div
                key={q.session.id}
                className="px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">
                    {q.session.title}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {fmtDate(q.session.meeting_at)} · 대장 {q.hostNickname} ·
                    결제 {q.paidCount}건
                    {q.meetingOver ? "" : " · 모임 진행 전"}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                    {q.account
                      ? `${q.account.bank_name} ${q.account.account_number} (${q.account.holder_name})`
                      : "⚠ 정산 계좌 미등록"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-gray-500">
                    총 {q.gross.toLocaleString()}원 − 수수료{" "}
                    {q.fee.toLocaleString()}원
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-200">
                    {q.net.toLocaleString()}원
                  </div>
                </div>
                {q.settlement ? (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
                    정산 완료 · {fmtDate(q.settlement.paid_at)} · 지급{" "}
                    {q.settlement.net_amount.toLocaleString()}원
                  </span>
                ) : (
                  <SettleButton
                    sessionId={q.session.id}
                    title={q.session.title}
                    net={q.net}
                    disabled={!q.meetingOver}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 주문 목록 */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 text-sm font-semibold text-white">
          결제 주문{" "}
          <span className="text-[11px] font-normal text-gray-500">
            최근 {orders.length}건
          </span>
        </div>
        {orders.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500 text-center">
            아직 주문이 없어요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-white/5">
                  <th className="px-5 py-2.5">주문</th>
                  <th className="px-3 py-2.5">결제자</th>
                  <th className="px-3 py-2.5 text-right">금액</th>
                  <th className="px-3 py-2.5">상태</th>
                  <th className="px-3 py-2.5">일시</th>
                  <th className="px-5 py-2.5 text-right">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-3 text-gray-200 max-w-[280px] truncate">
                      {o.order_name}
                    </td>
                    <td className="px-3 py-3 text-gray-400">
                      {nickById.get(o.user_id) ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-gray-200">
                      {o.amount.toLocaleString()}원
                    </td>
                    <td className={`px-3 py-3 text-xs ${STATUS_CLASS[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {fmtDate(o.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {o.status === "paid" ? (
                        <RefundButton orderId={o.id} orderName={o.order_name} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
