"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MessageSquare, Send } from "lucide-react";

export type EventSettings = {
  confirm_sms_enabled: boolean;
  confirm_sms_template: string;
  updated_at: string | null;
  updated_by: string | null;
};

const VARS = ["{이름}", "{인원}", "{금액}", "{신청번호}"] as const;
const SAMPLE: Record<string, string> = {
  "{이름}": "홍길동",
  "{인원}": "2명",
  "{금액}": "72,000원",
  "{신청번호}": "nsg-mh2k3x-a1b2c3",
};

/** event-signup 함수와 같은 기준 — 한글 2바이트, 90바이트 넘으면 LMS */
function smsBytes(s: string) {
  let n = 0;
  for (const ch of s) n += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  return n;
}

function fill(t: string) {
  return t.replace(/\{(이름|인원|금액|신청번호)\}/g, (m) => SAMPLE[m] ?? "");
}

function fmt(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConfirmSmsCard({
  slug,
  initial,
  sent,
  failed,
}: {
  slug: string;
  initial: EventSettings | null;
  /** 이 이벤트에서 확정 문자가 나간 주문 수 / 실패 수 */
  sent: number;
  failed: number;
}) {
  const [saved, setSaved] = useState<EventSettings>(
    initial ?? {
      confirm_sms_enabled: false,
      confirm_sms_template: "",
      updated_at: null,
      updated_by: null,
    }
  );
  const [enabled, setEnabled] = useState(saved.confirm_sms_enabled);
  const [template, setTemplate] = useState(saved.confirm_sms_template);
  const [testPhone, setTestPhone] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  const dirty =
    enabled !== saved.confirm_sms_enabled || template !== saved.confirm_sms_template;
  const preview = fill(template);
  const bytes = smsBytes(preview);

  const insertVar = (v: string) => {
    const el = ta.current;
    if (!el) return setTemplate((t) => t + v);
    const { selectionStart: s, selectionEnd: e } = el;
    const next = template.slice(0, s) + v + template.slice(e);
    setTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + v.length, s + v.length);
    });
  };

  const save = async () => {
    setBusy("save");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/events/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, enabled, template }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      setSaved(data.settings);
      setMsg({
        tone: "ok",
        text: enabled ? "저장했어요. 이제 결제하면 문자가 나가요." : "저장했어요. 문자는 꺼져 있어요.",
      });
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("test");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/events/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, template }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "발송 실패");
      setMsg({ tone: "ok", text: `${testPhone} 로 테스트 문자를 보냈어요 (${data.type}).` });
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "발송 실패" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <MessageSquare className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-white">결제 확정 문자</h2>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            enabled ? "bg-emerald-500" : "bg-white/15"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className={`text-xs ${enabled ? "text-emerald-300" : "text-gray-500"}`}>
          {enabled ? "켜짐" : "꺼짐"}
        </span>
        <span className="ml-auto text-[11px] text-gray-500">
          보낸 문자 {sent}건{failed > 0 && <span className="text-red-300"> · 실패 {failed}건</span>}
          {saved.updated_at && ` · 마지막 저장 ${fmt(saved.updated_at)}${saved.updated_by ? ` ${saved.updated_by}` : ""}`}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        결제가 끝나면 대표 신청자에게 한 번 보내요. 같이 신청한 사람에게는 가지 않아요.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {VARS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVar(v)}
                className="inline-flex items-center px-2 h-6 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-gray-200"
              >
                {v}
              </button>
            ))}
          </div>
          <textarea
            ref={ta}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={7}
            maxLength={1000}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-100 leading-relaxed focus:outline-none focus:border-white/30"
          />
        </div>
        <div>
          <div className="mb-1.5 flex h-6 items-center text-[11px] text-gray-500">
            미리보기 · {bytes}바이트 ·{" "}
            <span className={bytes > 90 ? "ml-1 text-amber-300" : "ml-1 text-gray-300"}>
              {bytes > 90 ? "장문(LMS)" : "단문(SMS)"}
            </span>
          </div>
          <div className="min-h-[10.5rem] whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-200 leading-relaxed">
            {preview || <span className="text-gray-600">문구를 입력하세요</span>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy !== null}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-white text-black text-xs font-semibold disabled:opacity-40"
        >
          {busy === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          저장
        </button>
        {dirty && <span className="text-[11px] text-amber-300">저장하지 않은 변경이 있어요</span>}
        <div className="ml-auto flex items-center gap-2">
          <input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="테스트 받을 번호"
            inputMode="tel"
            className="h-8 w-40 rounded-md border border-white/10 bg-black/30 px-2.5 text-xs text-gray-100 focus:outline-none focus:border-white/30"
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={!testPhone || !template.trim() || busy !== null}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs text-gray-200 disabled:opacity-40"
          >
            {busy === "test" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            테스트 발송
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`mt-3 rounded-lg border px-4 py-2.5 text-xs flex items-center gap-2 ${
            msg.tone === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {msg.tone === "ok" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          {msg.text}
        </div>
      )}
    </section>
  );
}
