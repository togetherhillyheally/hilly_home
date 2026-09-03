"use client";

import { useState, type ReactNode } from "react";
import { Bell, MessageCircle, Users, type LucideIcon } from "lucide-react";

type TabKey = "overview" | "activity" | "chat";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "개요", icon: Users },
  { key: "activity", label: "라이브 이력", icon: Bell },
  { key: "chat", label: "소통", icon: MessageCircle },
];

export default function SessionTabs({
  overview,
  activity,
  chat,
  overviewCount,
  activityCount,
  chatCount,
}: {
  overview: ReactNode;
  activity: ReactNode;
  chat: ReactNode;
  overviewCount?: number;
  activityCount?: number;
  chatCount?: number;
}) {
  const [tab, setTab] = useState<TabKey>("overview");

  const countMap: Record<TabKey, number | undefined> = {
    overview: overviewCount,
    activity: activityCount,
    chat: chatCount,
  };

  return (
    <div>
      <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 mb-4">
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          const count = countMap[t.key];
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 h-9 text-sm font-semibold transition ${
                active
                  ? "bg-white/[0.12] text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {count != null ? (
                <span
                  className={`ml-0.5 text-[10px] font-mono ${active ? "text-gray-400" : "text-gray-600"}`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 모든 탭 마운트 유지 — 지도 상단은 계속 살아있고, 아래만 전환. 상태 보존.
          min-h 로 탭 전환 시 스크롤 위치·주변 요소 흔들리지 않게 고정. */}
      <div className="min-h-[520px]">
        <div className={tab === "overview" ? "" : "hidden"}>{overview}</div>
        <div className={tab === "activity" ? "" : "hidden"}>{activity}</div>
        <div className={tab === "chat" ? "" : "hidden"}>{chat}</div>
      </div>
    </div>
  );
}
