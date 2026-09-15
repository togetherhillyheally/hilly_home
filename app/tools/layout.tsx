/**
 * /tools/* 하위 페이지의 어두운 배경 강제 layout.
 * 서버 렌더링 시점부터 body 배경을 #0D1117 로 칠해 PWA 실행 초기의 흰색 플래시를 방지.
 */
export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        html, body { background-color: #0D1117; color-scheme: dark; }
      `}</style>
      {children}
    </>
  );
}
