"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ClipboardList,
  CloudLightning,
  MessageSquareShare,
  Users,
} from "lucide-react";
import { ASSIGNMENTS } from "./items";

type Accent = "sky" | "violet" | "amber" | "rose" | "emerald" | "pink";

const ACCENT_CLASSES: Record<
  Accent,
  { icon: string; ring: string; chip: string }
> = {
  sky: {
    icon: "text-sky-300 bg-sky-500/15 border-sky-500/30",
    ring: "ring-sky-500/20",
    chip: "bg-sky-500/15 text-sky-300",
  },
  violet: {
    icon: "text-violet-300 bg-violet-500/15 border-violet-500/30",
    ring: "ring-violet-500/20",
    chip: "bg-violet-500/15 text-violet-300",
  },
  amber: {
    icon: "text-amber-300 bg-amber-500/15 border-amber-500/30",
    ring: "ring-amber-500/20",
    chip: "bg-amber-500/15 text-amber-300",
  },
  rose: {
    icon: "text-rose-300 bg-rose-500/15 border-rose-500/30",
    ring: "ring-rose-500/20",
    chip: "bg-rose-500/15 text-rose-300",
  },
  emerald: {
    icon: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
    ring: "ring-emerald-500/20",
    chip: "bg-emerald-500/15 text-emerald-300",
  },
  pink: {
    icon: "text-pink-300 bg-pink-500/15 border-pink-500/30",
    ring: "ring-pink-500/20",
    chip: "bg-pink-500/15 text-pink-300",
  },
};

/**
 * PDF 참고자료 요약 뷰. 접힘 카드로 필요한 것만 열기.
 */
export default function Reference() {
  return (
    <div className="space-y-2.5">
      <Accordion
        icon={<Camera className="h-4 w-4" />}
        title="조사사진 촬영기준"
        subtitle="촬영방향·구도·번호관리"
        accent="sky"
        defaultOpen
      >
        <dl className="divide-y divide-white/5">
          {SHOOTING.map(([k, v]) => (
            <div
              key={k}
              className="grid grid-cols-1 md:grid-cols-[110px_1fr] gap-y-0.5 md:gap-x-3 py-2.5 text-sm"
            >
              <dt className="text-gray-400 font-medium">{k}</dt>
              <dd className="text-gray-100 leading-snug">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 rounded-lg border border-sky-500/20 bg-sky-500/[0.04] p-3 text-sm text-gray-200">
          <div className="text-sky-300 font-semibold text-xs mb-1.5">
            촬영 예시 — 포장 → 비포장 → 포장
          </div>
          <ul className="space-y-1 text-gray-300">
            <li className="flex gap-2">
              <span className="text-sky-400">·</span>
              <span>
                <span className="font-mono text-rose-300">포장 01 시작</span>{" "}
                → 사진
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-400">·</span>
              <span>
                <span className="font-mono text-rose-300">포장 01 종료</span>{" "}
                →{" "}
                <span className="font-mono text-rose-300">비포장 01 시작</span>{" "}
                → 사진
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-400">·</span>
              <span>
                <span className="font-mono text-rose-300">비포장 01 시작</span>{" "}
                →{" "}
                <span className="font-mono text-rose-300">비포장 01 종료</span>{" "}
                → 사진
              </span>
            </li>
          </ul>
        </div>
      </Accordion>

      <Accordion
        icon={<ClipboardList className="h-4 w-4" />}
        title="조사항목별 판단 기준"
        subtitle={`${CRITERIA.length}개 항목`}
        accent="violet"
      >
        <ul className="space-y-2.5">
          {CRITERIA.map((r, i) => (
            <li
              key={i}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ACCENT_CLASSES.violet.chip}`}
                >
                  {r.cat}
                </span>
                <span className="text-sm font-semibold text-white">
                  {r.item}
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-0.5">판단 기준</div>
              <div className="text-sm text-gray-200 mb-2 leading-snug">
                {r.criterion}
              </div>
              <div className="text-xs text-gray-400 mb-0.5">현장 예시</div>
              <div className="text-sm text-gray-300 leading-snug">
                {r.example}
              </div>
            </li>
          ))}
        </ul>
      </Accordion>

      <Accordion
        icon={<AlertTriangle className="h-4 w-4" />}
        title="조사 진행이 어려운 경우"
        subtitle="대처 방안"
        accent="amber"
      >
        <div className="text-sm text-gray-200 space-y-4">
          <section>
            <SectionLabel color="amber">어려운 경우</SectionLabel>
            <ul className="list-disc pl-5 space-y-1 text-gray-300 mt-1.5">
              <li>
                <strong className="text-white">미조성 구간</strong> — 계획노선은
                있으나 실제 숲길·임도·보행로가 조성되어 있지 않음
              </li>
              <li>
                <strong className="text-white">노선확인불가 구간</strong> —
                수풀·훼손·단절·흔적 소실 등으로 진행 방향 확인 어려움
              </li>
              <li>
                <strong className="text-white">통행불가 구간</strong> —
                절벽·급경사·붕괴·하천 등으로 안전상 진행 불가
              </li>
            </ul>
          </section>
          <section>
            <SectionLabel color="amber">대처 방안</SectionLabel>
            <ul className="list-disc pl-5 space-y-1 text-gray-300 mt-1.5">
              <li>임의로 우회로를 기존/신규 노선으로 판단·기록하지 않음</li>
              <li>마지막으로 노선을 확인한 지점에서 좌표·사진·현장의견 기록</li>
              <li className="text-white font-medium">
                가능하면 반대편에서 접근하여 다시 노선이 확인되는 지점도 기록
              </li>
              <li>
                우회 시 GPX상 &ldquo;조사노선&rdquo;과 &ldquo;이동을 위한
                우회경로&rdquo;가 혼동되지 않도록 별도 표시
              </li>
            </ul>
            <p className="mt-2 text-xs text-gray-500">
              ※ 최종 노선 판단은 조사자가 아니라 센터 검수 과정에서 결정
            </p>
          </section>
        </div>
      </Accordion>

      <Accordion
        icon={<CloudLightning className="h-4 w-4" />}
        title="기상 상황별 세부 대응"
        subtitle={`${WEATHER.length}가지 상황`}
        accent="amber"
      >
        <div className="space-y-3">
          {WEATHER.map((w, i) => (
            <section
              key={i}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="text-amber-300 font-semibold text-sm mb-1.5">
                {w.title}
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300 leading-snug">
                {w.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Accordion>

      <Accordion
        icon={<MessageSquareShare className="h-4 w-4" />}
        title="조사 전·후 과정 공유"
        subtitle="시작 → 특이상황 → 마무리 → 업로드"
        accent="emerald"
      >
        <ul className="space-y-2.5">
          {SHARING.map((s, i) => (
            <li
              key={i}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 rounded px-1.5 py-0.5">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-white">
                  {s.step}
                </span>
              </div>
              <div className="text-sm text-gray-200 leading-snug mb-1.5">
                {s.action}
              </div>
              <div className="text-xs text-gray-400">공유 내용</div>
              <div className="text-sm text-gray-300 leading-snug">
                {s.content}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
          ※ 조사자료 업로드는 조사완료 후 2일 이내 구글드라이브에 업로드. 1일차
          조사는 업로드 후 피드백 진행 예정.
        </p>
      </Accordion>

      <Accordion
        icon={<Users className="h-4 w-4" />}
        title="구역별 조사자 배정"
        subtitle={`${ASSIGNMENTS.length}개 구역`}
        accent="rose"
      >
        {/* 모바일: 카드 리스트 / 데스크탑: 표 */}
        <div className="md:hidden space-y-2.5">
          {ASSIGNMENTS.map((a) => (
            <div
              key={a.zone}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-500/15 text-rose-300 text-xs font-bold flex items-center justify-center">
                    {a.zone}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {a.regions}
                  </span>
                </div>
                <span className="text-xs text-gray-400 tabular-nums">
                  {a.totalKm}
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-0.5">세부구간</div>
              <div className="text-sm text-gray-200 mb-2 leading-snug">
                {a.segments}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  본선{" "}
                  <span className="tabular-nums text-gray-200">
                    {a.main ?? "-"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  복선{" "}
                  <span className="tabular-nums text-gray-200">
                    {a.sub ?? "-"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  계{" "}
                  <span className="tabular-nums text-white font-semibold">
                    {a.totalCount}
                  </span>
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/5">
                <div className="text-xs text-gray-400 mb-0.5">조사자</div>
                <div className="text-sm text-rose-300 leading-snug">
                  {a.investigators}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 bg-white/[0.03] text-xs">
                <th className="px-2 py-2 text-left">구역</th>
                <th className="px-2 py-2 text-left">세부구간</th>
                <th className="px-2 py-2 text-left">지역</th>
                <th className="px-2 py-2 text-right">본선</th>
                <th className="px-2 py-2 text-right">복선</th>
                <th className="px-2 py-2 text-right">계</th>
                <th className="px-2 py-2 text-left">조사자</th>
                <th className="px-2 py-2 text-right">총 거리</th>
              </tr>
            </thead>
            <tbody>
              {ASSIGNMENTS.map((a) => (
                <tr key={a.zone} className="border-t border-white/5">
                  <td className="px-2 py-2 text-white text-center font-semibold">
                    {a.zone}
                  </td>
                  <td className="px-2 py-2 text-gray-100">{a.segments}</td>
                  <td className="px-2 py-2 text-gray-300">{a.regions}</td>
                  <td className="px-2 py-2 text-right text-gray-300 tabular-nums">
                    {a.main ?? "-"}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-300 tabular-nums">
                    {a.sub ?? "-"}
                  </td>
                  <td className="px-2 py-2 text-right text-white font-semibold tabular-nums">
                    {a.totalCount}
                  </td>
                  <td className="px-2 py-2 text-rose-300">
                    {a.investigators}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-300 tabular-nums">
                    {a.totalKm}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>
    </div>
  );
}

function SectionLabel({
  children,
  color,
}: {
  children: React.ReactNode;
  color: Accent;
}) {
  return (
    <div
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${ACCENT_CLASSES[color].chip}`}
    >
      {children}
    </div>
  );
}

function Accordion({
  title,
  subtitle,
  icon,
  accent,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: Accent;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accentCls = ACCENT_CLASSES[accent];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] active:bg-white/[0.06] transition"
      >
        <span
          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${accentCls.icon}`}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-white text-sm leading-tight truncate">
            {title}
          </span>
          {subtitle ? (
            <span className="block text-[11px] text-gray-500 mt-0.5 truncate">
              {subtitle}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div className="px-4 pb-4 pt-2 border-t border-white/5">{children}</div>
      ) : null}
    </div>
  );
}

const SHOOTING: [string, string][] = [
  ["촬영방향", "조사 진행방향을 바라보고 촬영"],
  ["구간형 자료", "시작점 1장 + 종료점 1장 필수"],
  [
    "지점형 자료",
    "대상 지점의 위치와 주변 상황을 확인할 수 있는 전경사진 1장 이상",
  ],
  ["추가사진", "시설물 파손·위험요인 등 세부 확인이 필요한 경우 상세사진 추가"],
  [
    "사진구도",
    "대상만 확대하지 않고 노선·주변 지형·시설물의 위치 관계가 함께 나타나도록",
  ],
  ["촬영위치", "현장 입력한 GPS 지점과 가급적 동일한 위치에서 촬영"],
  [
    "중복촬영",
    "동일 대상을 여러 장 촬영하지 않되, 한 장으로 파악이 어려우면 추가",
  ],
  [
    "번호관리",
    "현장 입력 번호와 사진 번호를 동일하게 관리 (예: 추락03 → 사진도 추락 03)",
  ],
  ["사진품질", "흔들림·역광·손가락 가림 방지"],
  ["안전", "도로·절벽·급경사 지역은 안전한 위치에서만 촬영"],
];

const CRITERIA = [
  {
    cat: "노면상태",
    item: "포장(비포장)",
    criterion: "현재 보행로의 주된 노면 형태로 구분",
    example:
      "콘크리트·아스콘·블록 등 → 포장 / 흙길·마사토·자갈 → 비포장. ※ 임도는 구분 필요",
  },
  {
    cat: "시설물",
    item: "시설물 종류",
    criterion: "노선상 또는 노선에서 직접 이용 가능한 시설",
    example: "광역센터·안내소·대피소·쉼터·화장실·급수시설 등",
  },
  {
    cat: "시설물",
    item: "시설물 위치",
    criterion: "실제 설치된 위치를 GPS 포인트로 기록",
    example: "시설 중앙 또는 출입구 등 대표지점",
  },
  {
    cat: "통신음영",
    item: "통신 가능 여부",
    criterion: "현장에서 휴대전화 통신상태 직접 확인",
    example:
      "SKT·KT·LG U+ 중 1개 통신사라도 통화·데이터 불가 → 통신음영구간",
  },
  {
    cat: "통신음영",
    item: "통신불능 시작·종료",
    criterion: "이동 중 통신 불가 지점과 다시 가능한 지점을 기록",
    example: "일시적 끊김보다는 일정 구간 지속 여부 확인 후 시작·종료 포인트",
  },
  {
    cat: "도로접점",
    item: "무보행로",
    criterion: "트레일 노선과 차량도로가 동일 노선을 함께 이용",
    example: "도로변·차도(중앙선 유무)와 동일 공간을 따라 이동. ※ 중앙선 있는 경우만",
  },
  {
    cat: "도로접점",
    item: "도로횡단",
    criterion: "트레일 노선이 차량 통행 도로를 가로질러 지나가는 경우",
    example: "국도·지방도·시군도 등을 횡단. ※ 중앙선 있는 경우만",
  },
  {
    cat: "지형위험",
    item: "추락위험",
    criterion:
      "노선 주변 급경사지·절벽 등 인명사고 가능성 + 방호시설 미흡",
    example:
      "노선 가장자리 절벽·급경사, 노면 폭 협소, 안전난간 없음/파손, 노면 붕괴 등",
  },
  {
    cat: "지형위험",
    item: "산사태·낙석위험",
    criterion: "상부 사면에서 암석 낙하 흔적 또는 사면 붕괴 징후",
    example:
      "낙석·균열 암반, 낙석 흔적, 낙석방지망 파손, 사면 토사 붕괴, 지반 균열, 나무 기울어짐 등",
  },
];

const WEATHER = [
  {
    title: "① 집중호우·계곡 수위 상승",
    items: [
      "계곡·하천·저지대에서 즉시 이탈",
      "불어난 계곡·침수된 도로를 건너지 않음",
      "산사태 우려 급경사지·비탈면에서 이격",
      "안전장소 이동 후 담당자에게 위치·상황 보고",
    ],
  },
  {
    title: "② 낙뢰 발생",
    items: [
      "천둥·번개 확인 시 즉시 조사 중단",
      "정상부·능선·암릉·개방된 장소에서 신속 이탈",
      "키가 큰 나무 바로 아래에서 대피하지 않음",
      "등산스틱·우산 등 긴 물체는 몸에서 떨어뜨림",
      "건물·차량 등 안전한 장소로 대피",
      "마지막 천둥·번개 후 충분한 시간 대기 후 이동 여부 판단",
    ],
  },
  {
    title: "③ 강풍",
    items: [
      "수목이 심하게 흔들리거나 가지 낙하 위험 시 조사 중단",
      "고사목·낙하물 위험지역·절벽·능선부에서 이탈",
      "바람으로 보행 균형 어려우면 즉시 안전한 곳으로 이동",
      "강풍 지속 시 당일 조사 종료",
    ],
  },
  {
    title: "④ 폭염",
    items: [
      "충분한 식수 확보 + 수시로 수분 섭취",
      "장시간 연속조사 피하고 그늘에서 휴식",
      "어지러움·두통·메스꺼움·근육경련 시 즉시 조사 중단",
      "증상 지속·의식저하 시 119 신고",
    ],
  },
  {
    title: "⑤ 안개·시야불량",
    items: [
      "노선 식별 어려우면 임의 진행하지 않음",
      "GPS상 노선만 믿고 절벽·급경사지로 진입하지 않음",
      "안전 장소에서 시야 확보까지 대기",
      "시야 회복 어렵거나 일몰 임박 시 조사 종료",
    ],
  },
];

const SHARING = [
  {
    step: "조사 시작",
    action: "현장조사 시작 전 관리자에게 시작 사실 공유 후 실시",
    content: "조사자명, 조사구간, 시작시간, 시작지점, 동행자, 특이사항",
  },
  {
    step: "특이상황 발생",
    action: "조사 중 안전·노선·기상 특이상황 발생 시 즉시 공유",
    content:
      "발생위치, 발생내용, 현장상황, 조사 지속·중단 여부 및 조치사항",
  },
  {
    step: "조사 마무리",
    action: "조사 종료 후 현장에서 안전하게 이탈한 후 종료 사실 공유",
    content: "종료시간, 조사 완료범위, 미조사구간, 현장 특이사항, 조사자 안전상태",
  },
  {
    step: "조사자료 업로드",
    action: "조사 종료 후 조사자료를 지정된 저장공간에 업로드",
    content: "GPX 트랙, 조사포인트, 현장사진, 현장의견, 기타 조사자료",
  },
];
