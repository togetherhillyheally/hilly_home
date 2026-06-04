"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

type Target = "all" | "super" | "puzzle" | "host" | "tester" | "specific";

const TARGET_OPTIONS: { value: Target; label: string; desc: string }[] = [
  { value: "all", label: "전체", desc: "가입한 모든 유저" },
  { value: "tester", label: "테스터", desc: "is_tester = true" },
  { value: "super", label: "슈퍼어드민", desc: "is_super_admin = true" },
  { value: "puzzle", label: "퍼즐어드민", desc: "is_puzzle_admin = true" },
  { value: "host", label: "인증 호스트", desc: "is_host_verified = true" },
  { value: "specific", label: "특정 유저", desc: "user_id 직접 입력" },
];

type Summary = {
  total: number;
  pushed: number;
  saved_only: number;
  failed: number;
};

export default function NotificationSender() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [target, setTarget] = useState<Target>("all");
  const [customIds, setCustomIds] = useState("");
  const [type, setType] = useState("notice");
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);

  const canSend = title.trim().length > 0 && type.trim().length > 0 && !sending;

  const parseIds = (raw: string): string[] =>
    raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const send = async () => {
    if (!canSend) return;
    const targetLabel =
      TARGET_OPTIONS.find((o) => o.value === target)?.label ?? target;
    const customUserIds = target === "specific" ? parseIds(customIds) : [];
    if (target === "specific" && customUserIds.length === 0) {
      setErrorMsg("user_id를 1개 이상 입력해주세요.");
      return;
    }
    if (
      !window.confirm(
        `${targetLabel}에게 푸시 알림을 발송할까요?\n\n제목: ${title}`
      )
    )
      return;

    setErrorMsg("");
    setSummary(null);
    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          customUserIds,
          type: type.trim(),
          title: title.trim(),
          body: bodyText.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        summary?: Summary;
      };
      if (!res.ok) {
        setErrorMsg(data.error ?? "발송 실패");
        return;
      }
      setSummary(data.summary ?? null);
      startTransition(() => router.refresh());
    } catch {
      setErrorMsg("네트워크 오류");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="text-lg font-semibold text-white mb-1">새 알림 발송</h2>
      <p className="text-xs text-gray-500 mb-6">
        notifications 테이블 저장 + Expo Push API 호출
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            발송 대상
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TARGET_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setTarget(opt.value)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  target === opt.value
                    ? "bg-orange-500/15 border-orange-500/40 text-white"
                    : "bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.05]"
                }`}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {target === "specific" ? (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              user_id (콤마/공백/줄바꿈 구분)
            </label>
            <textarea
              value={customIds}
              onChange={(e) => setCustomIds(e.target.value)}
              rows={3}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-orange-500/50 resize-none"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-400 mb-2">
              타입
            </label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="notice"
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="알림 제목"
              maxLength={200}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            본문
          </label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={3}
            placeholder="(선택) 푸시 본문"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50 resize-none"
          />
        </div>

        {errorMsg ? <p className="text-xs text-red-400">{errorMsg}</p> : null}

        {summary ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-200 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              총 <strong className="text-white">{summary.total}</strong>건
            </span>
            <span>
              · 푸시 발송{" "}
              <strong className="text-white">{summary.pushed}</strong>
            </span>
            <span>
              · 토큰 없음{" "}
              <strong className="text-white">{summary.saved_only}</strong>
            </span>
            {summary.failed > 0 ? (
              <span className="text-red-300">
                · 실패 <strong>{summary.failed}</strong>
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            onClick={send}
            disabled={!canSend}
            className="px-5 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white text-sm font-medium disabled:opacity-40 inline-flex items-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 발송 중...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> 발송
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
