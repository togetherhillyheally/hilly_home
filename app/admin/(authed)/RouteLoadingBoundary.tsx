"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminLoading from "./AdminLoading";

// 같은 Suspense 경계 안에서 형제 라우트로 이동하면(예: 목록 → 상세) React가
// 깜빡임 방지를 위해 폴백 대신 이전 화면을 그대로 유지한다. pathname을 key로
// 주면 경로가 바뀔 때마다 경계가 새로 마운트되어, 신규 라우트마다 loading.tsx
// 파일을 따로 두지 않아도 항상 폴백이 뜬다. 검색어/페이지네이션처럼 pathname은
// 그대로고 query만 바뀌는 경우엔 key가 안 바뀌므로 기존의 부드러운 전환이 유지된다.
export default function RouteLoadingBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Suspense key={pathname} fallback={<AdminLoading />}>
      {children}
    </Suspense>
  );
}
