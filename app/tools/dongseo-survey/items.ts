/**
 * 동서트레일 조사항목 마스터 (PDF 기준).
 * - point: 지점형 → 단일 라벨 (예: 광역센터01)
 * - range: 구간형 → 시작/종료 페어 (예: 포장시작01 / 포장종료01)
 */

export type ItemDef =
  | {
      key: string;
      category: string;
      label: string;
      type: "point";
      /** 야장에 실제로 적히는 라벨. 지정 없으면 label 사용. */
      pointLabel?: string;
      hint?: string;
    }
  | {
      key: string;
      category: string;
      label: string;
      type: "range";
      startLabel: string;
      endLabel: string;
      hint?: string;
    };

export const ITEMS: ItemDef[] = [
  {
    key: "pavement",
    category: "노면·통행상태",
    label: "포장",
    type: "range",
    startLabel: "포장시작",
    endLabel: "포장종료",
    hint: "콘크리트·아스콘·블록 등 → 포장 / 흙길·마사토·자갈 등 → 비포장",
  },
  { key: "hub", category: "시설물", label: "광역센터", type: "point" },
  { key: "info", category: "시설물", label: "안내소", type: "point" },
  { key: "evac", category: "시설물", label: "대피소", type: "point" },
  { key: "rest", category: "시설물", label: "쉼터", type: "point" },
  { key: "toilet", category: "시설물", label: "화장실", type: "point" },
  {
    key: "water",
    category: "시설물",
    label: "급수시설",
    type: "point",
    pointLabel: "식수",
  },
  {
    key: "no_signal",
    category: "통신음영",
    label: "통신음영구간",
    type: "range",
    startLabel: "통신불능시작",
    endLabel: "통신불능종료",
    hint: "SKT·KT·LG U+ 중 1개라도 통화·데이터 불가 시",
  },
  {
    key: "no_walkway",
    category: "도로접점",
    label: "도로 중첩 (무보행로)",
    type: "range",
    startLabel: "무보행로시작",
    endLabel: "무보행로종료",
    hint: "차량도로와 노선이 함께 이어지는 구간 (중앙선 있는 경우만)",
  },
  {
    key: "road_cross",
    category: "도로접점",
    label: "도로 횡단",
    type: "point",
    pointLabel: "도로횡단",
    hint: "국도·지방도·시군도 등 횡단 지점 (중앙선 있는 경우만)",
  },
  {
    key: "fall",
    category: "지형위험",
    label: "추락위험",
    type: "point",
    pointLabel: "추락",
  },
  {
    key: "landslide",
    category: "지형위험",
    label: "산사태위험",
    type: "point",
    pointLabel: "산사태",
    hint: "낙석위험 포함",
  },
  {
    key: "special",
    category: "특이지점",
    label: "기타위험구간 등",
    type: "point",
    pointLabel: "특이사항",
  },
  {
    key: "typo",
    category: "오기",
    label: "오기 (트랙 삭제 필요)",
    type: "point",
    pointLabel: "오기",
    hint: "잘못 기록된 트랙 삭제용 표식",
  },
];

/** 구간형 조사항목의 최근 미완료 시작(end 없음) — 종료 버튼 활성화용 */
export type EntryPoint = {
  seq: number;
  timestamp: number;
  entryId?: string; // 서버 동기화용 client-generated uuid
};
export type EntryRange = {
  seq: number;
  start: number | null;
  end: number | null;
  startEntryId?: string; // range_start row uuid
  endEntryId?: string; // range_end row uuid
};

/** 조사자에게 배정된 본선/복선 구간 옵션 */
export const SEGMENT_OPTIONS: string[] = [
  ...Array.from({ length: 55 }, (_, i) => `${i + 1}구간`),
  ...Array.from({ length: 9 }, (_, i) => `복선 ${i + 1}`),
];

/**
 * 조사자별 배정 (PDF 붙임 표). 참고용.
 */
export type AssignmentRow = {
  zone: number;
  segments: string;
  regions: string;
  main: number | null;
  sub: number | null;
  totalCount: number;
  investigators: string;
  totalKm: string;
};

export const ASSIGNMENTS: AssignmentRow[] = [
  { zone: 1, segments: "1~8구간", regions: "충남 (태안·서산·당진·예산)", main: 8, sub: null, totalCount: 8, investigators: "희남, 종훈", totalKm: "120.9km" },
  { zone: 2, segments: "9~16구간", regions: "충남 (예산·홍성·청양·공주)", main: 8, sub: null, totalCount: 8, investigators: "희남, 종훈", totalKm: "106.8km" },
  { zone: 3, segments: "17~24구간", regions: "충남·세종·대전·충북 (공주·세종·유성·대덕·동구·보은·청주)", main: 8, sub: null, totalCount: 8, investigators: "태건", totalKm: "112.7km" },
  { zone: 4, segments: "25~31구간 + 복선1", regions: "충북 (청주·보은·괴산)", main: 7, sub: 1, totalCount: 8, investigators: "준섭, 성훈", totalKm: "139.3km" },
  { zone: 5, segments: "32~39구간", regions: "충북·경북 (괴산·상주·문경·예천)", main: 8, sub: null, totalCount: 8, investigators: "효진", totalKm: "130.0km" },
  { zone: 6, segments: "40~47구간", regions: "경북·충북 (예천·영주·봉화·단양)", main: 8, sub: null, totalCount: 8, investigators: "영조", totalKm: "122.9km" },
  { zone: 7, segments: "48~55구간", regions: "경북 (봉화·울진)", main: 8, sub: null, totalCount: 8, investigators: "민서", totalKm: "123.7km" },
  { zone: 8, segments: "복선2~9", regions: "충북 (괴산·충주·제천·단양)", main: null, sub: 8, totalCount: 8, investigators: "준섭, 성훈", totalKm: "130.1km" },
];
