// 공유/딥링크 URL 빌더 — 웹(hilly_home)·앱이 동일 도메인 사용.
// App Links(hillyheally.com/*) + iOS associatedDomains 로 앱 딥링크 연결됨.
// (hilly_rn/lib/links.ts 와 동일 형식 유지)

export const WEB_BASE_URL = "https://hillyheally.com";

/** 지도(트레일) 공유 링크 — /t/{trailId} 웹 랜딩(앱 미설치 폴백) + 앱 딥링크 */
export function buildTrailShareUrl(trailId: string): string {
  return `${WEB_BASE_URL}/t/${trailId}`;
}
