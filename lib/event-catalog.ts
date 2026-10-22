/**
 * BO 에서 아는 이벤트 메타 — event_signups.event_slug 기준.
 * 팀 구성 규칙(팀 수·팀 인원·조)은 팀 보드 UI 의 슬롯/정원 경고에 쓰인다.
 * 등록되지 않은 slug 는 DEFAULT_EVENT_CONFIG 로 표시.
 */

export type EventConfig = {
  name: string;
  /** 행사일 표기 (표시용) */
  dateLabel?: string;
  teamCount: number;
  teamSize: number;
  /** 팀 안의 조 이름 — 조마다 트래커 1개 */
  squads: string[];
  squadSize: number;
  capacity: number;
};

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  name: "",
  teamCount: 4,
  teamSize: 4,
  squads: ["A", "B"],
  squadSize: 2,
  capacity: 16,
};

export const EVENT_CATALOG: Record<string, EventConfig> = {
  "natseongot-2026-11": {
    name: "낯선곳으로 — 광교산",
    dateLabel: "2026.11.14",
    teamCount: 4,
    teamSize: 4,
    squads: ["A", "B"],
    squadSize: 2,
    capacity: 16,
  },
};

export function getEventConfig(slug: string): EventConfig {
  return EVENT_CATALOG[slug] ?? { ...DEFAULT_EVENT_CONFIG, name: slug };
}
