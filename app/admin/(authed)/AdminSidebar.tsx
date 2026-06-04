"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV, type NavBadgeKey } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

type Session = { nickname: string | null; phoneNumber: string | null };
type Badges = Partial<Record<NavBadgeKey, number>>;

type Props = {
  session: Session;
  badges: Badges;
};

function NavBody({
  pathname,
  badges,
  session,
  onItemClick,
  onLogout,
}: {
  pathname: string;
  badges: Badges;
  session: Session;
  onItemClick?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <span className="text-base font-semibold text-white tracking-tight">
          힐리힐리 관리자
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {ADMIN_NAV.map((group, gi) => (
          <div key={gi}>
            {group.title ? (
              <div className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] text-gray-500 uppercase">
                {group.title}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const badgeVal = item.badgeKey
                  ? (badges[item.badgeKey] ?? 0)
                  : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onItemClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badgeVal > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500/15 text-orange-300 text-[10px] font-medium border border-orange-500/30">
                          {badgeVal}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-white/5">
        <div className="px-3 py-2">
          <div className="text-[10px] text-gray-500 tracking-wider uppercase">
            로그인
          </div>
          <div className="text-sm text-white truncate mt-0.5">
            {session.nickname ?? "관리자"}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/[0.04] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar({ session, badges }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin");
    router.refresh();
  };

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 h-14 flex items-center px-3 bg-[#08080f]/90 backdrop-blur border-b border-white/5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/5"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 w-72 bg-[#0c0c14] border-white/5 text-white"
          >
            <SheetTitle className="sr-only">관리자 메뉴</SheetTitle>
            <NavBody
              pathname={pathname}
              badges={badges}
              session={session}
              onItemClick={() => setOpen(false)}
              onLogout={handleLogout}
            />
          </SheetContent>
        </Sheet>
        <span className="ml-2 text-sm font-semibold text-white">
          힐리힐리 관리자
        </span>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-[#0c0c14] border-r border-white/5">
        <NavBody
          pathname={pathname}
          badges={badges}
          session={session}
          onLogout={handleLogout}
        />
      </aside>
    </>
  );
}
