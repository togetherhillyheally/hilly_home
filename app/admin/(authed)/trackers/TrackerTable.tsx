"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AssignPicker from "./AssignPicker";

export type TrackerDevice = {
  id: string;
  imei: string;
  hw_imei: string | null;
  label: string | null;
  status: string;
  battery_mv: number | null;
  battery_pct: number | null;
  last_seen_at: string | null;
  user_id: string | null;
  created_at: string;
  user_nickname?: string | null;
};

/** 최근 수신으로 보는 생사. 절전(1시간 보고) 기기도 있어 '끊김' 은 1시간 기준. */
function signalOf(lastSeen: string | null): {
  label: string;
  cls: string;
} {
  if (!lastSeen) return { label: "수신 없음", cls: "text-gray-500" };
  const min = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (min < 10) return { label: "수신중", cls: "text-emerald-400" };
  if (min < 60) return { label: "지연", cls: "text-amber-400" };
  return { label: "끊김", cls: "text-red-400" };
}

/** 기기가 %로 보고하면 그대로, 전압만 있으면 리튬셀 대략치로 환산 */
function batteryText(d: TrackerDevice): string {
  if (d.battery_pct != null) return `${d.battery_pct}%`;
  if (d.battery_mv == null) return "—";
  const pct = Math.min(
    100,
    Math.max(0, Math.round(((d.battery_mv - 3500) / 700) * 100))
  );
  return `${pct}% (${(d.battery_mv / 1000).toFixed(2)}V)`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** JT808 기기(단말 ID 12자리)와 MT710(IMEI 15자리)은 명령 체계가 다르다.
 *  1초는 매뉴얼 규정(10~3600초) 밖 — 기기가 거부하면 "실패"로 표시된다. */
function presetsFor(imei: string) {
  const jt = imei.length !== 15;
  return [
    { label: "1초", command: jt ? "INTERVAL,1" : "MODE,1,1", warn: true },
    { label: "10초", command: jt ? "INTERVAL,10" : "MODE,1,10" },
    { label: "30초", command: jt ? "INTERVAL,30" : "MODE,1,30" },
    { label: "절전 1시간", command: jt ? "INTERVAL,3600" : "MODE,3,1" },
    { label: "재시작", command: "REBOOT" },
  ];
}

const CMD_STATUS_LABEL: Record<string, string> = {
  pending: "전송 대기",
  sent: "기기로 전송됨",
  acked: "적용 완료",
  failed: "실패",
};

const CMD_STATUS_CLS: Record<string, string> = {
  pending: "text-gray-400",
  sent: "text-amber-400",
  acked: "text-emerald-400",
  failed: "text-red-400",
};

export type LastCommand = {
  device_id: string;
  command: string;
  status: string;
  reply: string | null;
  created_at: string;
};

export default function TrackerTable({
  devices,
  lastCommands = {},
}: {
  devices: TrackerDevice[];
  /** device_id → 최근 명령 1건 (적용 여부 확인용) */
  lastCommands?: Record<string, LastCommand>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  /** 배정 검색창을 펼친 기기 */
  const [assignId, setAssignId] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>, deviceId: string) => {
    setBusyId(deviceId);
    setErrorMsg("");
    const res = await fetch("/api/admin/trackers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErrorMsg(j.error ?? "요청에 실패했어요.");
      return false;
    }
    router.refresh();
    return true;
  };

  const sendCommand = async (device: TrackerDevice, command: string) => {
    setBusyId(device.id);
    setErrorMsg("");
    const res = await fetch("/api/admin/trackers/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: device.id, command }),
    });
    setBusyId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErrorMsg(j.error ?? "명령 전송에 실패했어요.");
      return;
    }
    setOpenId(null);
  };

  if (devices.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
        등록된 기기가 없습니다. 위에서 기기 ID로 재고 등록을 해주세요.
      </div>
    );
  }

  return (
    <>
      {errorMsg && (
        <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {errorMsg}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="bg-white/[0.04] text-xs text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">기기 ID</th>
              <th className="px-4 py-3 text-left font-medium">라벨</th>
              <th className="px-4 py-3 text-left font-medium">신호</th>
              <th className="px-4 py-3 text-left font-medium">배터리</th>
              <th className="px-4 py-3 text-left font-medium">마지막 수신</th>
              <th className="px-4 py-3 text-left font-medium">배정</th>
              <th className="px-4 py-3 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => {
              const sig = signalOf(d.last_seen_at);
              const retired = d.status === "retired";
              const busy = busyId === d.id;
              return (
                <tr
                  key={d.id}
                  className={`border-t border-white/5 ${retired ? "opacity-40" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">
                    {d.imei}
                    {d.hw_imei && (
                      <span className="mt-0.5 block text-[10px] text-gray-600">
                        IMEI {d.hw_imei}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white">{d.label ?? "—"}</td>
                  <td className={`px-4 py-3 ${sig.cls}`}>
                    {retired ? "중지됨" : sig.label}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{batteryText(d)}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {timeAgo(d.last_seen_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {d.user_nickname ?? (
                      <span className="text-gray-600">미배정</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {busy && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                      )}
                      <button
                        onClick={() =>
                          setOpenId(openId === d.id ? null : d.id)
                        }
                        className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/5"
                      >
                        원격 설정
                      </button>
                      {d.user_id ? (
                        <button
                          onClick={() => {
                            if (!confirm(`${d.label ?? d.imei} 기기를 회수할까요?`))
                              return;
                            void call({ id: d.id, user_id: null }, d.id);
                          }}
                          className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/5"
                        >
                          회수
                        </button>
                      ) : (
                        !retired && (
                          <button
                            onClick={() => {
                              setOpenId(null);
                              setAssignId(assignId === d.id ? null : d.id);
                            }}
                            className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/5"
                          >
                            배정
                          </button>
                        )
                      )}
                      <button
                        onClick={() => {
                          const next = retired ? "inactive" : "retired";
                          if (
                            !confirm(
                              retired
                                ? "다시 사용 가능 상태로 되돌릴까요?"
                                : "사용 중지하면 관제·앱 목록에서 숨겨져요. 계속할까요?"
                            )
                          )
                            return;
                          void call({ id: d.id, status: next }, d.id);
                        }}
                        className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/5"
                      >
                        {retired ? "복구" : "중지"}
                      </button>
                    </div>
                    {openId === d.id && (
                      <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                        {presetsFor(d.imei).map((p) => (
                          <button
                            key={p.command}
                            onClick={() => void sendCommand(d, p.command)}
                            disabled={busy}
                            title={
                              p.warn
                                ? "매뉴얼 규정(10초~) 밖이라 기기가 거부할 수 있어요"
                                : undefined
                            }
                            className={`rounded-md px-2.5 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-50 ${
                              p.warn
                                ? "border border-amber-500/40 bg-amber-500/10"
                                : "bg-white/10"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {lastCommands[d.id] && (
                      <p className="mt-1.5 text-right text-[11px] text-gray-500">
                        최근 {lastCommands[d.id].command} ·{" "}
                        <span
                          className={
                            CMD_STATUS_CLS[lastCommands[d.id].status] ??
                            "text-gray-400"
                          }
                        >
                          {CMD_STATUS_LABEL[lastCommands[d.id].status] ??
                            lastCommands[d.id].status}
                        </span>
                      </p>
                    )}
                    {assignId === d.id && (
                      <AssignPicker
                        busy={busy}
                        onCancel={() => setAssignId(null)}
                        onPick={async (userId, nickname) => {
                          if (
                            !confirm(
                              `${d.label ?? d.imei} 기기를 ${nickname} 님에게 배정할까요?`
                            )
                          )
                            return;
                          const ok = await call(
                            { id: d.id, user_id: userId },
                            d.id
                          );
                          if (ok) setAssignId(null);
                        }}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-gray-500">
        명령은 큐에 쌓였다가 기기가 서버에 접속하는 순간 전달돼요. 절전 중인
        기기는 최대 1시간 걸릴 수 있어요.
      </p>
    </>
  );
}
