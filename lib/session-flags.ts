// 모험을 시작하고 바로 끄거나(체감상 즉시 종료) 시작한 줄도 모르고 방치한
// 세션을 가려내기 위한 임계값. 실측 소요시간/거리가 둘 중 하나라도 이 값
// 이하면 "짧은 세션"으로 분류한다.
export const SHORT_SESSION_MAX_MINUTES = 1;
export const SHORT_SESSION_MAX_KM = 0.5;

// cancelled 세션은 이미 "취소" 상태로 구분되므로 별도 취급하지 않는다
// (실측 텔레메트리가 없는 cancelled/completed 세션을 전부 여기 포함하면
// completed의 64%가 결측이라 플래그 의미가 없어짐 — 순수 실측값만 본다).
export function isShortSession(
  actualElapsedMinutes: number | null,
  actualDistanceKm: number | null
): boolean {
  return (
    (actualElapsedMinutes != null &&
      actualElapsedMinutes < SHORT_SESSION_MAX_MINUTES) ||
    (actualDistanceKm != null && actualDistanceKm <= SHORT_SESSION_MAX_KM)
  );
}

// completed 세션인데 actual_elapsed_minutes 가 null 인 경우 — 앱의 정상 종료
// 흐름(useSessionComplete)은 started_at 만 있으면 거리와 무관하게 항상
// 경과시간을 계산해 저장하므로, 이 값이 null 이라는 건 사용자가 앱에서
// 직접 종료를 누른 적이 없다는 뜻. 24시간 idle 세션을 강제로 completed 처리하는
// pg_cron(complete_idle_hiking_sessions)이 상태만 바꾸고 텔레메트리는 안 건드려서
// 생기는 값 — "짧은 세션"과 달리 아예 종료를 못 하고 방치된 세션.
export function isAbandonedSession(
  status: string,
  startedAt: string | null,
  actualElapsedMinutes: number | null
): boolean {
  return (
    status === "completed" &&
    startedAt != null &&
    actualElapsedMinutes == null
  );
}
