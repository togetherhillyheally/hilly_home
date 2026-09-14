// 관리자 권한 체계: 등급(tier) 기본값 + 계정별 메뉴 override + 리소스 스코프.
// admin-nav.ts 의 사이드바 항목과 MENU_KEYS 가 1:1로 대응해야 함.

export type AdminTier = "master" | "admin" | "manager" | "client";

export const ADMIN_TIERS: AdminTier[] = ["master", "admin", "manager", "client"];

export const MENU_KEYS = [
  "dashboard",
  "delete-requests",
  "reports",
  "notifications",
  "users",
  "trails",
  "stamps",
  "quiz-pool",
  "sessions",
  "puzzles",
  "progress",
  "puzzle-progress",
  "ledger",
  "bottle-ledger",
  "settlements",
  "legal",
  "app-versions",
  "backgrounds",
  "surveys",
  "content-reset",
  "nickname-denylist",
] as const;

export type MenuKey = (typeof MENU_KEYS)[number];

/** 스코프(리소스 id 제한)를 지원하는 메뉴. 이 목록에 없는 메뉴는 스코프 개념이 없음(메뉴 권한 = 전체 조회). */
export const SCOPABLE_MENU_KEYS: MenuKey[] = ["puzzle-progress"];

/** master/admin 은 전체 메뉴, manager 는 운영/콘텐츠/퍼즐 그룹만, client 는 기본값 없음(전부 override로 부여). */
const MANAGER_DEFAULT_MENU_KEYS: MenuKey[] = [
  "dashboard",
  "delete-requests",
  "reports",
  "notifications",
  "trails",
  "stamps",
  "quiz-pool",
  "sessions",
  "puzzles",
  "progress",
  "puzzle-progress",
];

export function defaultMenuKeysForTier(tier: AdminTier): Set<MenuKey> {
  if (tier === "master" || tier === "admin") return new Set(MENU_KEYS);
  if (tier === "manager") return new Set(MANAGER_DEFAULT_MENU_KEYS);
  return new Set(); // client
}

export type MenuAccessOverride = { menu_key: string; allowed: boolean };

/** 등급 기본값에 계정별 override(추가 허용/차단)를 적용한 최종 허용 메뉴 집합. */
export function resolveMenuKeys(
  tier: AdminTier,
  overrides: MenuAccessOverride[]
): Set<MenuKey> {
  const keys = defaultMenuKeysForTier(tier);
  for (const o of overrides) {
    if (!MENU_KEYS.includes(o.menu_key as MenuKey)) continue;
    if (o.allowed) keys.add(o.menu_key as MenuKey);
    else keys.delete(o.menu_key as MenuKey);
  }
  return keys;
}

/** 등급/메뉴/스코프 편집(권한 위임)은 master 만 가능. */
export function canManagePermissions(tier: AdminTier): boolean {
  return tier === "master";
}

export type MenuScopeMap = Partial<Record<MenuKey, string[]>>;

/**
 * 스코프 지원 메뉴에 대해 이 계정이 볼 수 있는 리소스 id 목록을 반환 (화이트리스트).
 * 스코프를 하나도 체크하지 않았으면 빈 배열 — 등급과 무관하게 아무것도 안 보임.
 * 스코프 개념이 없는 메뉴는 null(제한 없음).
 */
export function resolveScope(
  menuKey: MenuKey,
  scopes: MenuScopeMap
): string[] | null {
  if (!SCOPABLE_MENU_KEYS.includes(menuKey)) return null;
  return scopes[menuKey] ?? [];
}
