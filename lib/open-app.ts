// 앱 딥링크 열기 공용 로직 — /t/[id](지도 공유), /a/[code](모험 초대) 랜딩에서 사용.
// prod 앱 scheme/패키지 — hilly_rn app.config.ts 와 동일하게 유지할 것.
export const APP_SCHEME = "hillyheally";
export const ANDROID_PACKAGE = "com.hillyheally.app";

export type Platform = "ios" | "android" | "other";
export type InAppBrowser = "kakao" | "instagram" | null;

export function detectPlatform(ua: string): Platform {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

// 인앱 브라우저 감지.
// - kakao: 커스텀 스킴 이동 허용(설치 시 "열기" 확인창) → 자동 시도 가능
// - instagram/facebook: 스킴 이동 차단 → 외부 브라우저 안내만
export function detectInApp(ua: string): InAppBrowser {
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/Instagram|FBAN|FBAV|FB_IAB/i.test(ua)) return "instagram";
  return null;
}

/**
 * 앱 열기 시도. path 예: "t/<trailId>", "a/<code>"
 * - Android: intent:// — 미설치 시 에러 없이 스토어로 폴백
 * - iOS: 커스텀 스킴 — 설치 시 즉시 전환, 미설치 시 시스템 알럿 후 랜딩 유지
 */
export function attemptOpenApp(
  path: string,
  platform: Platform,
  fallbackStoreUrl?: string,
) {
  if (platform === "android") {
    const fallback = fallbackStoreUrl
      ? `S.browser_fallback_url=${encodeURIComponent(fallbackStoreUrl)};`
      : "";
    window.location.href = `intent://${path}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};${fallback}end`;
    return;
  }
  window.location.href = `${APP_SCHEME}://${path}`;
}

/**
 * 랜딩 진입 시 자동 앱 열기 시도 여부.
 * 모바일이고, 스킴이 차단되는 인앱(인스타/페북)이 아닐 때만.
 */
export function shouldAutoAttempt(platform: Platform, inApp: InAppBrowser) {
  return platform !== "other" && inApp !== "instagram";
}
