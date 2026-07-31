"use client";

import { useState, type ReactNode } from "react";
import { Puzzle, Trophy } from "lucide-react";

type TabKey = "settings" | "cert";

export default function PuzzleTabs({
  settings,
  cert,
}: {
  settings: ReactNode;
  cert: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("settings");

  const tabs: { key: TabKey; label: string; icon: typeof Puzzle }[] = [
    { key: "settings", label: "퍼즐 설정", icon: Puzzle },
    { key: "cert", label: "완주 인증", icon: Trophy },
  ];

  return (
    <div>
      {/* 세그먼트 탭 */}
      <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 mb-6">
        {tabs.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
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
            </button>
          );
        })}
      </div>

      {/* 두 탭 모두 마운트 유지 — 숨김으로 전환해 폼 상태 보존 */}
      <div className={tab === "settings" ? "" : "hidden"}>{settings}</div>
      <div className={tab === "cert" ? "" : "hidden"}>
        <p className="text-sm text-gray-400 mb-4 leading-relaxed">
          이 퍼즐을 코스 완주 인증으로 쓰기 위한 설정이에요. 먼저 「퍼즐 설정」
          탭에서 <span className="text-gray-200 font-medium">연결 코스</span>를 저장한
          뒤, 아래에서 커스텀 씨앗 · 완주 배율 · 보물을 맞춥니다.
        </p>
        <div className="flex flex-col gap-6">{cert}</div>
      </div>
    </div>
  );
}
