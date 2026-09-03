"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 테이블 <tr> 전체를 클릭 가능하게 만드는 래퍼.
 * 셀 내부 링크/버튼은 그대로 동작 (stopPropagation 필요 없음 — 브라우저가 자체 처리).
 */
export default function ClickableRow({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <tr
      onClick={(e) => {
        // 셀 안의 <a>/<button> 클릭은 원본 유지 — 그 외 여백 클릭 시에만 이동
        const target = e.target as HTMLElement;
        if (target.closest("a,button")) return;
        router.push(href);
      }}
      className={`cursor-pointer ${className ?? ""}`}
    >
      {children}
    </tr>
  );
}
