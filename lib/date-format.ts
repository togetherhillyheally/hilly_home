/**
 * 어드민 페이지 공용 날짜 포매터 (KST 고정).
 *
 * Netlify 서버 컴포넌트는 UTC 로 렌더되므로 timeZone 을 명시하지 않으면
 * -9 시간으로 표시되는 문제가 있어 이 파일을 통해 강제한다.
 */

const KST = "Asia/Seoul" as const;

const DEFAULT_DATETIME: Intl.DateTimeFormatOptions = {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

const DEFAULT_DATE: Intl.DateTimeFormatOptions = {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
};

/** 날짜 + 시각 (예: 26. 08. 30. 오후 07:41). null/undefined 는 "—". */
export function formatKstDateTime(
  iso: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: KST,
    ...DEFAULT_DATETIME,
    ...opts,
  });
}

/** 날짜만 (예: 26. 08. 30.). null/undefined 는 "—". */
export function formatKstDate(
  iso: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: KST,
    ...DEFAULT_DATE,
    ...opts,
  });
}
