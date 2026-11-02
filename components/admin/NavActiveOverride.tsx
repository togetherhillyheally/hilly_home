"use client";

/**
 * 사이드바 활성 메뉴 덮어쓰기 — 주소만으로는 어느 메뉴인지 모를 때 쓴다.
 * 예: 보물지도 상세도 /admin/trails/[id] 라 그냥 두면 "코스 지도"가 켜진다.
 * 페이지에 <NavActiveOverride href="/admin/treasures" /> 를 두면 그 화면에서만 "보물 지도"가 켜진다.
 */
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

type Override = { pathname: string; href: string } | null;

let current: Override = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** 지금 주소에 걸린 덮어쓰기 href (없으면 null) */
export function useNavActiveOverride(pathname: string): string | null {
  const o = useSyncExternalStore(subscribe, () => current, () => null);
  return o && o.pathname === pathname ? o.href : null;
}

export default function NavActiveOverride({ href }: { href: string }) {
  const pathname = usePathname();
  useEffect(() => {
    current = { pathname, href };
    emit();
    return () => {
      if (current?.pathname === pathname && current.href === href) {
        current = null;
        emit();
      }
    };
  }, [pathname, href]);
  return null;
}
