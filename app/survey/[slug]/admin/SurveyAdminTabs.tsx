"use client";

import { useState, type ReactNode } from "react";
import { LayoutGrid, BarChart3 } from "lucide-react";

type TabKey = "cards" | "stats";

export default function SurveyAdminTabs({
  cards,
  stats,
  cardCount,
}: {
  cards: ReactNode;
  stats: ReactNode;
  cardCount: number;
}) {
  const [tab, setTab] = useState<TabKey>("cards");

  return (
    <div>
      <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 mb-6">
        <TabButton
          active={tab === "cards"}
          onClick={() => setTab("cards")}
          icon={<LayoutGrid className="h-4 w-4" />}
          label="명단"
          badge={cardCount}
        />
        <TabButton
          active={tab === "stats"}
          onClick={() => setTab("stats")}
          icon={<BarChart3 className="h-4 w-4" />}
          label="통계"
        />
      </div>

      {/* 두 뷰 모두 마운트 유지 — 탭 전환 시 상태·스크롤 보존 */}
      <div className={tab === "cards" ? "" : "hidden"}>{cards}</div>
      <div className={tab === "stats" ? "" : "hidden"}>{stats}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 h-9 text-sm font-semibold transition ${
        active
          ? "bg-white/[0.12] text-white"
          : "text-gray-400 hover:text-gray-200"
      }`}
    >
      {icon}
      {label}
      {badge != null ? (
        <span
          className={`ml-0.5 text-[10px] font-mono ${
            active ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
