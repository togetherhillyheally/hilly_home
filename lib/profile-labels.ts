// hilly_rn 온보딩에서 쓰는 코드값. 두 레포가 SDK를 공유하지 않으므로
// hilly_rn/components/onboarding/RegionSelector.tsx (REGIONS),
// hilly_rn/components/onboarding/Activity.tsx (ACTIVITIES)와 값이 어긋나지
// 않도록 코드 추가/변경 시 함께 갱신할 것.
export const REGION_LABELS: Record<string, string> = {
  "01": "서울",
  "02": "경기도",
  "03": "인천",
  "04": "강원도",
  "05": "충청도",
  "06": "전라도",
  "07": "경상도",
  "08": "제주도",
};

export const PROFILE_ACTIVITY_LABELS: Record<string, string> = {
  HKG: "하이킹",
  ROD: "로드 러닝",
  TRL: "트레일 러닝",
  CYL: "사이클",
};

export function regionLabel(code: string | null): string | null {
  if (!code) return null;
  return REGION_LABELS[code] ?? code;
}

export function profileActivityLabel(code: string | null): string | null {
  if (!code) return null;
  return PROFILE_ACTIVITY_LABELS[code] ?? code;
}
