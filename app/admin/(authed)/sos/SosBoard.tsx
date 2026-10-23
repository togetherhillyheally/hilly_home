"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BatteryLow,
  CheckCircle2,
  Loader2,
  MapPin,
  RotateCcw,
  Satellite,
  Siren,
  Smartphone,
} from "lucide-react";

export type SosItem = {
  key: string;
  source: "app" | "tracker";
  id: string;
  at: string;
  lat: number | null;
  lng: number | null;
  who: string;
  userId: string | null;
  /** app: 코스 이름 / tracker: 배정된 사용자 닉네임 */
  context: string | null;
  sessionId: string | null;
  note: string | null;
  battery: number | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

function fmt(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function ago(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}초 전`;
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

export default function SosBoard({ items: initial }: { items: SosItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setItems(initial), [initial]);

  useEffect(() => {
    const t = setInterval(() => startTransition(() => router.refresh()), 30_000);
    return () => clearInterval(t);
  }, [router]);

  const open = items.filter((i) => !i.resolvedAt);
  const shown = filter === "open" ? open : items;

  const toggle = async (item: SosItem, resolve: boolean) => {
    setBusyKey(item.key);
    setError(null);
    const snapshot = items;
    setItems((prev) =>
      prev.map((i) =>
        i.key === item.key
          ? { ...i, resolvedAt: resolve ? new Date().toISOString() : null, resolvedBy: resolve ? "나" : null }
          : i
      )
    );
    try {
      const res = await fetch(`/api/admin/sos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: item.source, id: item.id, resolve }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setItems(snapshot);
        setError(d?.error ?? "처리 실패");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setItems(snapshot);
      setError("네트워크 오류");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border text-sm font-semibold ${
            open.length > 0
              ? "bg-red-500/15 border-red-500/40 text-red-200 animate-pulse"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
          }`}
        >
          <Siren className="h-4 w-4" />
          미확인 {open.length}건
        </span>
        <div className="ml-auto flex gap-1">
          {(["open", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 h-8 rounded-lg text-xs font-medium border ${
                filter === f
                  ? "bg-orange-500/20 text-orange-200 border-orange-500/40"
                  : "bg-white/[0.04] text-gray-400 border-white/10 hover:text-white"
              }`}
            >
              {f === "open" ? "미확인" : `전체 ${items.length}`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          {filter === "open" ? "확인할 SOS가 없어요." : "SOS 기록이 없어요."}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((i) => {
            const resolved = !!i.resolvedAt;
            const hasPos = i.lat != null && i.lng != null;
            return (
              <div
                key={i.key}
                className={`rounded-xl border p-4 flex flex-wrap items-start gap-4 ${
                  resolved
                    ? "border-white/10 bg-white/[0.02] opacity-70"
                    : "border-red-500/40 bg-red-500/[0.06]"
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    resolved ? "bg-white/[0.06] text-gray-400" : "bg-red-500 text-white"
                  }`}
                >
                  {i.source === "app" ? <Smartphone className="h-5 w-5" /> : <Satellite className="h-5 w-5" />}
                </div>

                <div className="flex-1 min-w-[220px] space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-white">{i.who}</span>
                    <span className="text-[10px] px-1.5 h-5 inline-flex items-center rounded border border-white/10 text-gray-400">
                      {i.source === "app" ? "앱 SOS" : "트래커 SOS"}
                    </span>
                    {i.battery != null && (
                      <span
                        className={`text-[11px] inline-flex items-center gap-1 ${
                          i.battery <= 20 ? "text-red-300" : "text-gray-400"
                        }`}
                      >
                        <BatteryLow className="h-3.5 w-3.5" />
                        {i.battery}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {fmt(i.at)} · <span className={resolved ? "" : "text-red-300 font-semibold"}>{ago(i.at)}</span>
                    {i.context && (
                      <>
                        {" · "}
                        {i.source === "app" ? "코스 " : "사용자 "}
                        <span className="text-gray-300">{i.context}</span>
                      </>
                    )}
                  </div>
                  {i.note && <div className="text-sm text-amber-200">“{i.note}”</div>}
                  {hasPos ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-gray-400">
                        {i.lat!.toFixed(5)}, {i.lng!.toFixed(5)}
                      </span>
                      <a
                        href={`https://map.kakao.com/link/map/SOS,${i.lat},${i.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-orange-300 hover:text-orange-200"
                      >
                        <MapPin className="h-3.5 w-3.5" /> 카카오맵
                      </a>
                      <a
                        href={`https://www.google.com/maps?q=${i.lat},${i.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-300 hover:text-orange-200"
                      >
                        구글맵
                      </a>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(`${i.lat},${i.lng}`)}
                        className="text-gray-400 hover:text-white"
                      >
                        좌표 복사
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">위치 정보 없음</div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs">
                    {i.sessionId && (
                      <Link href={`/admin/sessions/${i.sessionId}`} className="text-gray-400 hover:text-white underline-offset-2 hover:underline">
                        세션 보기
                      </Link>
                    )}
                    {i.source === "tracker" && (
                      <Link href="/admin/trackers" className="text-gray-400 hover:text-white underline-offset-2 hover:underline">
                        트래커 목록
                      </Link>
                    )}
                  </div>
                  {resolved && (
                    <div className="text-[11px] text-emerald-300/80">
                      확인 완료 {fmt(i.resolvedAt!)}
                      {i.resolvedBy ? ` · ${i.resolvedBy}` : ""}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {resolved ? (
                    <button
                      type="button"
                      onClick={() => toggle(i, false)}
                      disabled={busyKey === i.key}
                      className="h-9 px-3 rounded-lg border border-white/10 text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> 되돌리기
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(i, true)}
                      disabled={busyKey === i.key}
                      className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {busyKey === i.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      확인 처리
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
