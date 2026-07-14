import {
  Bell,
  BookOpen,
  ClipboardList,
  Coins,
  FileText,
  Flag,
  Home,
  Image as ImageIcon,
  Map,
  MessageSquare,
  Mountain,
  Puzzle,
  Smartphone,
  Sprout,
  Stamp,
  Trophy,
  UserMinus,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavBadgeKey = "pendingDeletions" | "pendingReports";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: NavBadgeKey;
};

export type AdminNavGroup = {
  title?: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    items: [{ href: "/admin/dashboard", label: "대시보드", icon: Home }],
  },
  {
    title: "운영",
    items: [
      {
        href: "/admin/delete-requests",
        label: "계정 삭제 요청",
        icon: UserMinus,
        badgeKey: "pendingDeletions",
      },
      {
        href: "/admin/reports",
        label: "콘텐츠 신고",
        icon: Flag,
        badgeKey: "pendingReports",
      },
      { href: "/admin/notifications", label: "푸시/알림", icon: Bell },
    ],
  },
  {
    title: "유저",
    items: [
      { href: "/admin/users", label: "유저 / 권한", icon: Users },
    ],
  },
  {
    title: "콘텐츠",
    items: [
      { href: "/admin/trails", label: "코스 지도", icon: Map },
      { href: "/admin/stamps", label: "스탬프 지도", icon: Stamp },
      { href: "/admin/sessions", label: "모험", icon: Mountain },
    ],
  },
  {
    title: "퍼즐 & 씨앗",
    items: [
      { href: "/admin/puzzles", label: "퍼즐 정의", icon: Puzzle },
      { href: "/admin/progress", label: "사용자 진행", icon: Trophy },
      { href: "/admin/ledger", label: "씨앗 원장", icon: Coins },
    ],
  },
  {
    title: "정원",
    items: [
      { href: "/admin/objects", label: "정원 도감", icon: BookOpen },
      { href: "/admin/user-gardens", label: "모험자 정원", icon: Sprout },
      { href: "/admin/guestbook", label: "발자국", icon: MessageSquare },
    ],
  },
  {
    title: "시스템",
    items: [
      { href: "/admin/legal", label: "약관 · 방침", icon: FileText },
      { href: "/admin/app-versions", label: "앱 버전", icon: Smartphone },
      { href: "/admin/backgrounds", label: "프로필 배경", icon: ImageIcon },
      { href: "/admin/surveys", label: "설문 응답", icon: ClipboardList },
    ],
  },
];
