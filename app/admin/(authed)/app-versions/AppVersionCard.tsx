"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Apple, Bot, Check, Loader2 } from "lucide-react";

export type AppVersion = {
  id: number;
  platform: string;
  min_version: string;
  latest_version: string;
  store_url: string | null;
  force_update: boolean;
  message: string | null;
  updated_at: string;
};

const VERSION_RE = /^\d+\.\d+\.\d+$/;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppVersionCard({ version }: { version: AppVersion }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [minV, setMinV] = useState(version.min_version);
  const [latestV, setLatestV] = useState(version.latest_version);
  const [storeUrl, setStoreUrl] = useState(version.store_url ?? "");
  const [forceUpdate, setForceUpdate] = useState(version.force_update);
  const [message, setMessage] = useState(version.message ?? "");
  const [errorMsg, setErrorMsg] = useState("");

  const dirty =
    minV !== version.min_version ||
    latestV !== version.latest_version ||
    storeUrl !== (version.store_url ?? "") ||
    forceUpdate !== version.force_update ||
    message !== (version.message ?? "");

  const validationError = (() => {
    if (!VERSION_RE.test(minV)) return "최소 버전은 'x.y.z' 형식이어야 해요.";
    if (!VERSION_RE.test(latestV))
      return "최신 버전은 'x.y.z' 형식이어야 해요.";
    return null;
  })();

  const save = async () => {
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    setErrorMsg("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/app-versions/${version.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_version: minV,
          latest_version: latestV,
          store_url: storeUrl || null,
          force_update: forceUpdate,
          message: message || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "저장 실패");
        return;
      }
      setSavedAt(Date.now());
      startTransition(() => router.refresh());
    } catch {
      setErrorMsg("네트워크 오류");
    } finally {
      setSaving(false);
    }
  };

  const PlatformIcon = version.platform === "ios" ? Apple : Bot;
  const platformLabel = version.platform === "ios" ? "iOS" : "Android";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
            <PlatformIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              {platformLabel}
            </h2>
            <p className="text-[11px] text-gray-500">
              마지막 수정 · {formatDate(version.updated_at)}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="최소 버전" hint="이 버전 미만은 강제 업데이트 차단">
            <input
              type="text"
              value={minV}
              onChange={(e) => setMinV(e.target.value)}
              placeholder="1.0.0"
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50 font-mono"
            />
          </Field>
          <Field label="최신 버전" hint="앱스토어 최신 배포 버전">
            <input
              type="text"
              value={latestV}
              onChange={(e) => setLatestV(e.target.value)}
              placeholder="1.0.0"
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50 font-mono"
            />
          </Field>
        </div>

        <Field label="스토어 URL">
          <input
            type="url"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://..."
            className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
          />
        </Field>

        <Field label="업데이트 안내 메시지">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="앱에서 업데이트 안내 시 표시될 문구"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50 resize-none"
          />
        </Field>

        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/10">
          <div>
            <div className="text-sm text-white">강제 업데이트</div>
            <div className="text-[11px] text-gray-500">
              켜면 최소 버전 미만 유저는 앱 진입 차단
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={forceUpdate}
              onChange={(e) => setForceUpdate(e.target.checked)}
            />
            <span className="w-10 h-5 rounded-full bg-white/10 peer-checked:bg-red-500/80 transition-colors relative">
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  forceUpdate ? "translate-x-5" : ""
                }`}
              />
            </span>
          </label>
        </div>
      </div>

      {errorMsg ? (
        <p className="mt-4 text-xs text-red-400">{errorMsg}</p>
      ) : null}

      <div className="mt-5 flex items-center justify-end gap-3">
        {savedAt && !dirty ? (
          <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
            <Check className="h-3 w-3" /> 저장됨
          </span>
        ) : null}
        <button
          onClick={save}
          disabled={!dirty || saving || !!validationError}
          className="px-4 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white text-sm font-medium disabled:opacity-40"
        >
          {saving ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 저장 중...
            </span>
          ) : (
            "변경 저장"
          )}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-400">{label}</label>
        {hint ? <span className="text-[10px] text-gray-600">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
