import {
  Banknote,
  Bell,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileText,
  Flag,
  GlassWater,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Map,
  Mountain,
  Puzzle,
  Smartphone,
  Stamp,
  Trophy,
  UserMinus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MenuKey } from "@/lib/admin-permissions";

export type NavBadgeKey = "pendingDeletions" | "pendingReports";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  menuKey: MenuKey;
  badgeKey?: NavBadgeKey;
};

export type AdminNavGroup = {
  title?: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    items: [
      {
        href: "/admin/dashboard",
        label: "대시보드",
        icon: Home,
        menuKey: "dashboard",
      },
    ],
  },
  {
    title: "운영",
    items: [
      {
        href: "/admin/delete-requests",
        label: "계정 삭제 요청",
        icon: UserMinus,
        menuKey: "delete-requests",
        badgeKey: "pendingDeletions",
      },
      {
        href: "/admin/reports",
        label: "콘텐츠 신고",
        icon: Flag,
        menuKey: "reports",
        badgeKey: "pendingReports",
      },
      {
        href: "/admin/notifications",
        label: "푸시/알림",
        icon: Bell,
        menuKey: "notifications",
      },
    ],
  },
  {
    title: "유저",
    items: [
      {
        href: "/admin/users",
        label: "유저 / 권한",
        icon: Users,
        menuKey: "users",
      },
    ],
  },
  {
    title: "콘텐츠",
    items: [
      { href: "/admin/trails", label: "코스 지도", icon: Map, menuKey: "trails" },
      {
        href: "/admin/stamps",
        label: "스탬프 지도",
        icon: Stamp,
        menuKey: "stamps",
      },
      {
        href: "/admin/quiz-pool",
        label: "자동 퀴즈",
        icon: HelpCircle,
        menuKey: "quiz-pool",
      },
      {
        href: "/admin/sessions",
        label: "모험",
        icon: Mountain,
        menuKey: "sessions",
      },
    ],
  },
  {
    title: "퍼즐 & 씨앗",
    items: [
      {
        href: "/admin/puzzles",
        label: "퍼즐 정의",
        icon: Puzzle,
        menuKey: "puzzles",
      },
      {
        href: "/admin/progress",
        label: "사용자 진행",
        icon: Trophy,
        menuKey: "progress",
      },
      {
        href: "/admin/puzzle-progress",
        label: "퍼즐 진행 내역",
        icon: CheckCircle2,
        menuKey: "puzzle-progress",
      },
      {
        href: "/admin/ledger",
        label: "씨앗 원장",
        icon: Coins,
        menuKey: "ledger",
      },
      {
        href: "/admin/bottle-ledger",
        label: "물병 원장",
        icon: GlassWater,
        menuKey: "bottle-ledger",
      },
    ],
  },
  {
    title: "결제",
    items: [
      {
        href: "/admin/settlements",
        label: "참가비 정산",
        icon: Banknote,
        menuKey: "settlements",
      },
    ],
  },
  {
    title: "시스템",
    items: [
      {
        href: "/admin/legal",
        label: "약관 · 방침",
        icon: FileText,
        menuKey: "legal",
      },
      {
        href: "/admin/app-versions",
        label: "앱 버전",
        icon: Smartphone,
        menuKey: "app-versions",
      },
      {
        href: "/admin/backgrounds",
        label: "프로필 배경",
        icon: ImageIcon,
        menuKey: "backgrounds",
      },
      {
        href: "/admin/surveys",
        label: "설문 응답",
        icon: ClipboardList,
        menuKey: "surveys",
      },
    ],
  },
];

/** 세션의 허용 메뉴로 사이드바 항목을 필터링. 항목이 하나도 안 남는 그룹은 제거. */
export function filterNavByMenuKeys(
  nav: AdminNavGroup[],
  allowed: Set<MenuKey>
): AdminNavGroup[] {
  return nav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowed.has(item.menuKey)),
    }))
    .filter((group) => group.items.length > 0);
}

/** 권한 관리 화면에서 메뉴 key -> 한글 라벨 표시용. */
export function menuLabelMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      map[item.menuKey] = item.label;
    }
  }
  return map;
}

/** 로그인 직후 이동할 첫 화면. 등급마다 허용 메뉴가 다르므로 하드코딩된 경로 대신 이걸로 계산. */
export function firstAccessibleHref(allowed: Set<MenuKey>): string | null {
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      if (allowed.has(item.menuKey)) return item.href;
    }
  }
  return null;
}
