"use client";

/** 관리자 환불 버튼 — 토스 결제 취소 + 주문 refunded + 참가 취소까지 서버가 처리 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RefundButton({
  orderId,
  orderName,
}: {
  orderId: string;
  orderName: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (
      !window.confirm(
        `'${orderName}' 주문을 전액 환불할까요?\n결제 취소와 참가 취소가 함께 처리돼요.`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/refund-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "환불에 실패했어요.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      window.alert("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={run}
      disabled={busy}
      className="px-3 h-8 rounded-lg border border-white/10 text-xs text-gray-300 hover:text-red-300 hover:border-red-500/40 disabled:opacity-40"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        "환불"
      )}
    </button>
  );
}
