"use client";

/** 정산 완료 버튼 — 실제 이체는 관리자가 은행에서 수동으로, 여기선 기록만 남긴다 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SettleButton({
  sessionId,
  title,
  net,
  disabled,
}: {
  sessionId: string;
  title: string;
  net: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (
      !window.confirm(
        `'${title}' 정산을 완료 처리할까요?\n\n실지급액 ${net.toLocaleString()}원을 대장 계좌로 이체한 뒤 눌러주세요. 되돌릴 수 없어요.`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "정산 처리에 실패했어요.");
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
      disabled={busy || disabled}
      title={disabled ? "모임 진행 전에는 정산할 수 없어요" : undefined}
      className="px-3 h-9 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-medium disabled:opacity-40"
    >
      {busy ? (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 처리 중
        </span>
      ) : (
        "정산 완료"
      )}
    </button>
  );
}
